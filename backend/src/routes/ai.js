const express = require('express');
const router = express.Router();
const { generateSummary, detectDuplicate } = require('../services/openai');
const { supabase } = require('../utils/supabase');

router.post('/summarize', async (req, res) => {
  try {
    const { title, content, url } = req.body;
    const result = await generateSummary(title, content, url);
    const isDuplicate = await detectDuplicate(result.title, supabase);
    res.json({ ...result, isDuplicate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/daily-summary', async (req, res) => {
  try {
    // Obtener últimas noticias publicadas
    const { data: latestNews } = await supabase
      .from('news')
      .select('title, summary, category, comuna, source_name')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .limit(8);

    if (!latestNews || latestNews.length === 0) {
      return res.json({ items: [], _engine: 'demo', message: 'No hay noticias para resumir' });
    }

    // Construir prompt con las noticias
    const newsText = latestNews.map((n, i) => 
      `${i + 1}. [${n.category || 'Regional'}] ${n.title}${n.summary ? ' - ' + n.summary.slice(0, 150) : ''}`
    ).join('\n');

    const prompt = `Eres un editor de noticias de la Región de Ñuble, Chile. A continuación hay ${latestNews.length} noticias recientes. Genera 3 titulares resumidos (1 oración cada uno, máximo 100 caracteres por titular) destacando lo más importante del día. Formato JSON: {"items":[{"number":"01","text":"..."},{"number":"02","text":"..."},{"number":"03","text":"..."}]}. Noticias:\n${newsText}`;

    const result = await generateSummary(newsText, '', 'daily-summary');
    
    // Si tenemos IA real, extraemos el JSON del resultado
    if (result._engine !== 'demo' && result.summary) {
      try {
        const jsonMatch = result.summary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({ ...parsed, _engine: result._engine, generated_at: new Date().toISOString() });
        }
      } catch { /* fallback */ }
    }

    // Fallback: usar demo con las noticias reales
    const items = latestNews.slice(0, 3).map((n, i) => ({
      number: `0${i + 1}`,
      text: n.summary?.slice(0, 120) || n.title?.slice(0, 120) || 'Noticia de Ñuble',
    }));

    res.json({ items, _engine: 'demo', generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch-approve', async (req, res) => {
  try {
    const { ids } = req.body;
    const { error } = await supabase
      .from('news')
      .update({ is_approved: true, is_published: true, published_at: new Date().toISOString() })
      .in('id', ids);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
