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

router.post('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase no configurado' });
    }

    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Se requiere imagen en base64' });
    }

    const bucketReady = await ensureBucket();
    if (!bucketReady) {
      return res.status(500).json({ error: 'No se pudo preparar el storage' });
    }

    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagen inválido' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `uploads/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: `image/${ext}`,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: `Error subiendo imagen: ${uploadError.message}` });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
