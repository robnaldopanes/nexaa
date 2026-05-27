const express = require('express');
const router = express.Router();
const { supabase, HAS_VALID_CONFIG } = require('../utils/supabase');
const { fetchAllFeeds } = require('../services/rssFetcher');
const { checkDuplicate } = require('../services/duplicateFilter');

function noSupabase(res) {
  return res.json({ data: [], count: 0, demo: true, message: 'Supabase no configurado - mostrando datos de demostración' });
}

// GET: lista de inbox con filtros
router.get('/', async (req, res) => {
  try {
    if (!HAS_VALID_CONFIG) return noSupabase(res);
    const { status, source, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('news_inbox')
      .select('*')
      .order('detected_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      if (status === 'approved') {
        query = query.in('status', ['approved', 'published']);
      } else {
        query = query.eq('status', status);
      }
    }

    // Filtrar para que en la bandeja 'pending' solo salgan noticias de menos de 3 días de antigüedad
    if (status === 'pending') {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      query = query.gte('detected_at', threeDaysAgo.toISOString());
    }

    if (source) query = query.eq('source', source);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: conteo por estado
router.get('/counts', async (req, res) => {
  try {
    if (!HAS_VALID_CONFIG) return res.json({ pending: 0, approved: 0, ignored: 0, total: 0 });
    
    // Fallback manual para calcular conteos con filtrado de antigüedad de 3 días para las pendientes
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const counts = { pending: 0, approved: 0, ignored: 0, total: 0 };
    if (supabase) {
      const { data: all, error: fetchErr } = await supabase
        .from('news_inbox')
        .select('status, detected_at');
        
      if (all) {
        counts.total = all.length;
        // Solo contamos pendientes si tienen menos de 3 días de antigüedad
        counts.pending = all.filter(i => i.status === 'pending' && new Date(i.detected_at) >= threeDaysAgo).length;
        counts.approved = all.filter(i => i.status === 'approved' || i.status === 'published').length;
        counts.ignored = all.filter(i => i.status === 'ignored').length;
      }
    }
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: buscar inbox item por ID de noticia publicada
router.get('/by-published/:newsId', async (req, res) => {
  try {
    if (!HAS_VALID_CONFIG) return res.status(503).json({ error: 'Supabase no configurado' });
    const { data, error } = await supabase
      .from('news_inbox')
      .select('*')
      .eq('published_news_id', req.params.newsId)
      .maybeSingle(); // Usamos maybeSingle para que no lance error si no encuentra
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: fetch RSS ahora (manual)
router.post('/fetch', async (req, res) => {
  try {
    const articles = await fetchAllFeeds();
    const results = { total: articles.length, new: 0, duplicates: 0, skipped_old: 0, errors: 0, demo: !HAS_VALID_CONFIG };

    if (!HAS_VALID_CONFIG) {
      results.new = articles.length;
      return res.json({ 
        message: `${articles.length} artículos detectados (demo - Supabase no configurado)`, 
        ...results,
        sample: articles.slice(0, 3).map(a => ({ title: a.title, source: a.source }))
      });
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    for (const item of articles) {
      try {
        if (!item.title || !item.source_url) {
          results.errors++;
          continue;
        }

        // Filtro de antigüedad: Omitir si la noticia tiene más de 3 días de haber sido detectada/publicada
        const articleDate = new Date(item.detected_at);
        if (articleDate < threeDaysAgo) {
          results.skipped_old++;
          continue;
        }

        const isDup = await checkDuplicate(item, supabase);
        if (isDup) {
          results.duplicates++;
          continue;
        }

        if (supabase) {
          const { error } = await supabase.from('news_inbox').insert({
            title: item.title,
            source: item.source,
            source_url: item.source_url,
            image_url: item.image_url,
            summary: item.summary,
            content: item.content,
            category: item.category,
            status: 'pending',
            detected_at: item.detected_at,
          });
          if (error) { results.errors++; continue; }
        }
        results.new++;
      } catch {
        results.errors++;
      }
    }

    // 🧹 LIMPIEZA AUTOMÁTICA DEL INBOX
    let cleaned_old_pending = 0;
    let cleaned_ignored = 0;
    let cleaned_excess = 0;

    try {
      if (supabase) {
        // 1) Pendientes > 7 días → marcar como ignorados (ya no son noticia)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: oldPendingCount } = await supabase
          .from('news_inbox')
          .update({ status: 'ignored' })
          .eq('status', 'pending')
          .lt('detected_at', sevenDaysAgo.toISOString());
        cleaned_old_pending = oldPendingCount || 0;

        // 2) Ignorados > 30 días → eliminar definitivamente
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: oldIgnoredCount } = await supabase
          .from('news_inbox')
          .delete()
          .eq('status', 'ignored')
          .lt('detected_at', thirtyDaysAgo.toISOString());
        cleaned_ignored = oldIgnoredCount || 0;

        // 3) Límite total: mantener máximo 500 items (borrar los más viejos)
        const { count: totalCount } = await supabase
          .from('news_inbox')
          .select('*', { count: 'exact', head: true });
        if (totalCount && totalCount > 500) {
          const { data: oldestItems } = await supabase
            .from('news_inbox')
            .select('id')
            .order('detected_at', { ascending: true })
            .limit(totalCount - 500);
          if (oldestItems && oldestItems.length > 0) {
            const idsToDelete = oldestItems.map(i => i.id);
            await supabase.from('news_inbox').delete().in('id', idsToDelete);
            cleaned_excess = idsToDelete.length;
          }
        }
      }
    } catch (cleanErr) {
      console.warn('Error en limpieza automática:', cleanErr.message);
    }

    res.json({ 
      message: `${results.new} nuevas, ${results.duplicates} duplicadas, ${results.skipped_old} omitidas por antiguas, ${results.errors} errores. Limpieza: ${cleaned_old_pending} expiradas, ${cleaned_ignored} eliminadas, ${cleaned_excess} por exceso.`, 
      ...results,
      cleanup: { old_pending: cleaned_old_pending, deleted_ignored: cleaned_ignored, excess: cleaned_excess }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: actualizar estado de un item
router.put('/:id', async (req, res) => {
  try {
    if (!HAS_VALID_CONFIG) return res.status(503).json({ error: 'Supabase no configurado' });
    const { status, title, summary, content, category, comuna, image_url } = req.body;

    // 1. Obtener el item actual para verificar si tiene una noticia publicada asociada
    const { data: currentItem, error: fetchError } = await supabase
      .from('news_inbox')
      .select('published_news_id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    const updateData = {};
    if (status !== undefined) {
      if (!['pending', 'approved', 'ignored', 'published'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      updateData.status = status;
      if (status === 'approved' || status === 'published') {
        updateData.imported_at = new Date().toISOString();
      } else {
        // Si pasa a pending o ignored, reseteamos la referencia y la fecha de importación en el objeto a actualizar
        updateData.published_news_id = null;
        updateData.imported_at = null;
      }
    }

    if (title !== undefined) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (comuna !== undefined) updateData.comuna = comuna;
    if (image_url !== undefined) updateData.image_url = image_url;

    // 2. Si se cambia a 'pending' o 'ignored' y tiene una noticia asociada, primero actualizamos el inbox
    // para liberar la clave foránea (FK) de la base de datos antes de proceder con el delete.
    const hasAssociatedNews = status !== undefined && (status === 'pending' || status === 'ignored') && currentItem.published_news_id;

    // Actualizamos el inbox primero
    const { data: updatedItem, error: updateError } = await supabase
      .from('news_inbox')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Ahora que la clave foránea en news_inbox está desvinculada (puesta a NULL), eliminamos de forma segura la noticia en 'news'
    if (hasAssociatedNews) {
      console.log(`Eliminando noticia de la tabla final [ID: ${currentItem.published_news_id}] por desmarcado`);
      const { error: deleteError } = await supabase
        .from('news')
        .delete()
        .eq('id', currentItem.published_news_id);
      
      if (deleteError) {
        console.warn(`No se pudo eliminar la noticia asociada [ID: ${currentItem.published_news_id}]:`, deleteError.message);
      }
    }

    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: aprobar → publicar (crea noticia real)
router.post('/:id/approve', async (req, res) => {
  try {
    if (!HAS_VALID_CONFIG) return res.status(503).json({ error: 'Supabase no configurado' });
    const { is_national } = req.body;

    // Obtener item del inbox
    const { data: inboxItem, error: fetchError } = await supabase
      .from('news_inbox')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !inboxItem) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    // Si se aprueba como destacado nacional, quitamos el destacado nacional de cualquier otra noticia
    if (is_national) {
      console.log("Removiendo destacado nacional de noticias anteriores...");
      await supabase
        .from('news')
        .update({ is_featured: false })
        .eq('comuna', 'Nacional');
    }

    const slug = (inboxItem.title || 'sin-titulo')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);

    // Crear noticia real
    const { data: newsItem, error: insertError } = await supabase
      .from('news')
      .insert({
        title: inboxItem.title,
        summary: inboxItem.summary || '',
        content: inboxItem.content || '',
        image_url: inboxItem.image_url || '',
        source_url: inboxItem.source_url || '',
        source_name: inboxItem.source,
        category: inboxItem.category || 'Regional',
        comuna: is_national ? 'Nacional' : (inboxItem.comuna || null),
        tags: [],
        slug,
        ai_generated: false,
        is_approved: true,
        is_published: true,
        is_featured: is_national ? true : false,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Marcar inbox como published, actualizando la comuna a 'Nacional' si aplica
    await supabase
      .from('news_inbox')
      .update({ 
        status: 'published', 
        published_news_id: newsItem.id, 
        imported_at: new Date().toISOString(),
        comuna: is_national ? 'Nacional' : inboxItem.comuna,
        image_url: inboxItem.image_url || ''
      })
      .eq('id', req.params.id);

    res.json({ inbox: inboxItem, published: newsItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
