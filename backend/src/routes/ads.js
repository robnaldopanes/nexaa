const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');

const BUCKET_NAME = 'news-images';

async function ensureBucket() {
  if (!supabase) return false;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
      if (error && !error.message?.includes('already exists')) {
        console.error('Error creating bucket:', error.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Error ensuring bucket:', err.message);
    return false;
  }
}

async function uploadBase64ToStorage(base64String) {
  const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return null;
  
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  
  if (buffer.length > 5 * 1024 * 1024) return null;
  
  const bucketReady = await ensureBucket();
  if (!bucketReady) return null;
  
  const uniqueName = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueName, buffer, {
      contentType: `image/${ext}`,
      upsert: false,
    });
  
  if (uploadError) {
    console.error('Error uploading ad image:', uploadError);
    return null;
  }
  
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueName);
  return urlData.publicUrl;
}

router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    let query = supabase.from('ads').select('*').order('created_at', { ascending: false });
    if (active) query = query.eq('is_active', active === 'true');
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seed', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const brainDir = 'C:\\Users\\damian\\.gemini\\antigravity\\brain\\4be8ff7f-2741-425a-aeaf-0f5191ae86c7';

    const files = fs.readdirSync(brainDir);
    const principalFile = files.find(f => f.startsWith('nexaa_banner_principal_') && f.endsWith('.png'));
    const lateralFile = files.find(f => f.startsWith('nexaa_banner_lateral_') && f.endsWith('.png'));
    const noticiasFile = files.find(f => f.startsWith('nexaa_banner_noticias_') && f.endsWith('.png'));

    if (!principalFile || !lateralFile || !noticiasFile) {
      return res.status(400).json({ error: 'No se encontraron las imágenes generadas' });
    }

    const adsToSeed = [
      {
        name: 'Promoción NEXAA - Banner Principal',
        location: 'Banner Principal',
        fileName: principalFile,
        link_url: 'https://nexaa.vercel.app/publicidad'
      },
      {
        name: 'Promoción NEXAA - Barra Lateral',
        location: 'Barra lateral',
        fileName: lateralFile,
        link_url: 'https://nexaa.vercel.app/publicidad'
      },
      {
        name: 'Promoción NEXAA - Entre Noticias',
        location: 'Entre noticias',
        fileName: noticiasFile,
        link_url: 'https://nexaa.vercel.app/publicidad'
      }
    ];

    const results = [];
    for (const adSpec of adsToSeed) {
      const filePath = path.join(brainDir, adSpec.fileName);
      const buffer = fs.readFileSync(filePath);
      const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

      // Subir imagen a Storage en vez de guardar base64
      const storageUrl = await uploadBase64ToStorage(base64);
      
      const adBody = {
        name: adSpec.name,
        location: adSpec.location,
        image_url: storageUrl || base64, // fallback a base64 si falla Storage
        link_url: adSpec.link_url,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data, error } = await supabase.from('ads').insert(adBody).select().single();
      if (error) throw error;
      results.push(data);
    }

    res.json({ success: true, seeded: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/copy-favicon', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const srcPath = 'C:\\Users\\damian\\.gemini\\antigravity\\brain\\4be8ff7f-2741-425a-aeaf-0f5191ae86c7\\nexaa_favicon_1779660829090.png';
    const destAppIcon = 'c:\\Users\\damian\\Desktop\\la clase\\nexa\\frontend\\src\\app\\icon.png';
    const destPubIcon192 = 'c:\\Users\\damian\\Desktop\\la clase\\nexa\\frontend\\public\\images\\icon-192.png';
    const destPubIcon512 = 'c:\\Users\\damian\\Desktop\\la clase\\nexa\\frontend\\public\\images\\icon-512.png';

    // Create directory if it does not exist
    const pubImagesDir = 'c:\\Users\\damian\\Desktop\\la clase\\nexa\\frontend\\public\\images';
    if (!fs.existsSync(pubImagesDir)) {
      fs.mkdirSync(pubImagesDir, { recursive: true });
    }

    // Copy files
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destAppIcon);
      fs.copyFileSync(srcPath, destPubIcon192);
      fs.copyFileSync(srcPath, destPubIcon512);
      res.json({ success: true, message: 'Favicon copiado con éxito en todos los directorios' });
    } else {
      res.status(404).json({ error: 'No se encontró el archivo de origen nexaa_favicon' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.post('/', async (req, res) => {
  try {
    let body = { ...req.body };
    
    // Si image_url es base64, subir a Storage primero
    if (body.image_url && typeof body.image_url === 'string' && body.image_url.startsWith('data:image')) {
      const storageUrl = await uploadBase64ToStorage(body.image_url);
      if (storageUrl) {
        body.image_url = storageUrl;
      }
    }
    
    const { data, error } = await supabase.from('ads').insert(body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    let body = { ...req.body };
    
    // Si image_url es base64, subir a Storage primero
    if (body.image_url && typeof body.image_url === 'string' && body.image_url.startsWith('data:image')) {
      const storageUrl = await uploadBase64ToStorage(body.image_url);
      if (storageUrl) {
        body.image_url = storageUrl;
      }
    }
    
    const { data, error } = await supabase.from('ads').update(body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('ads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Anuncio eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/impression', async (req, res) => {
  try {
    const { data: ad, error: fetchError } = await supabase.from('ads').select('impressions').eq('id', req.params.id).single();
    if (fetchError) throw fetchError;
    
    const newCount = (ad.impressions || 0) + 1;
    const { error: updateError } = await supabase.from('ads').update({ impressions: newCount }).eq('id', req.params.id);
    if (updateError) throw updateError;
    
    res.json({ success: true, impressions: newCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/click', async (req, res) => {
  try {
    const { data: ad, error: fetchError } = await supabase.from('ads').select('clicks').eq('id', req.params.id).single();
    if (fetchError) throw fetchError;
    
    const newCount = (ad.clicks || 0) + 1;
    const { error: updateError } = await supabase.from('ads').update({ clicks: newCount }).eq('id', req.params.id);
    if (updateError) throw updateError;
    
    res.json({ success: true, clicks: newCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


