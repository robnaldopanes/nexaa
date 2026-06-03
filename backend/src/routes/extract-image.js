const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const { supabase, HAS_VALID_CONFIG } = require('../utils/supabase');

const BUCKET_NAME = 'news-images';
const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function isValidUrl(string) {
  try {
    const u = new URL(string);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function absolutizeUrl(imgUrl, baseUrl) {
  try {
    return new URL(imgUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractImageFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);

  const candidates = [];

  $('meta[property="og:image"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) candidates.push({ url: content, source: 'og:image' });
  });

  $('meta[property="og:image:secure_url"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) candidates.push({ url: content, source: 'og:image:secure_url' });
  });

  $('meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) candidates.push({ url: content, source: 'twitter:image' });
  });

  $('meta[name="twitter:image:src"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) candidates.push({ url: content, source: 'twitter:image:src' });
  });

  $('link[rel="image_src"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) candidates.push({ url: href, source: 'link:image_src' });
  });

  $('article img, main img, .article img, .post img, .content img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src) candidates.push({ url: src, source: 'article-img' });
  });

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src) candidates.push({ url: src, source: 'img' });
  });

  for (const c of candidates) {
    const absUrl = absolutizeUrl(c.url, baseUrl);
    if (absUrl && isValidUrl(absUrl)) {
      if (absUrl.startsWith('data:')) continue;
      if (absUrl.includes('.svg')) continue;
      return { url: absUrl, source: c.source };
    }
  }

  return null;
}

async function downloadImageAsBuffer(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NEXAA-ImageBot/1.0)',
        'Accept': 'image/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Tipo no es imagen: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error(`Imagen demasiado grande: ${Math.round(buffer.length / 1024)}KB`);
    }

    if (buffer.length < 100) {
      throw new Error('Imagen demasiado pequeña (posible error)');
    }

    return { buffer, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

function getExtensionFromContentType(contentType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType.toLowerCase()] || 'jpg';
}

async function uploadToStorage(buffer, contentType) {
  const ext = getExtensionFromContentType(contentType);
  const fileName = `inbox/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_IMAGE_SIZE,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error subiendo a Storage: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return urlData.publicUrl;
}

router.post('/extract-image', async (req, res) => {
  if (!HAS_VALID_CONFIG || !supabase) {
    return res.status(503).json({ error: 'Supabase no configurado' });
  }

  const { source_url, inbox_id } = req.body || {};

  if (!source_url || !isValidUrl(source_url)) {
    return res.status(400).json({ error: 'URL de fuente inválida' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const pageResponse = await fetch(source_url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!pageResponse.ok) {
      return res.status(502).json({ error: `No se pudo acceder a la URL: HTTP ${pageResponse.status}` });
    }

    const contentType = pageResponse.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.status(400).json({ error: 'La URL no es una página HTML' });
    }

    const html = await pageResponse.text();
    const result = extractImageFromHtml(html, source_url);

    if (!result) {
      return res.status(404).json({
        error: 'No se encontró ninguna imagen en la página. Puedes subir una manualmente.',
      });
    }

    const { buffer, contentType: imgContentType } = await downloadImageAsBuffer(result.url);

    const storageUrl = await uploadToStorage(buffer, imgContentType);

    if (inbox_id) {
      const { error: updateError } = await supabase
        .from('news_inbox')
        .update({ image_url: storageUrl })
        .eq('id', inbox_id);

      if (updateError) {
        console.warn('[extract-image] Error actualizando inbox:', updateError.message);
      }
    }

    return res.json({
      success: true,
      image_url: storageUrl,
      source: result.source,
      original_url: result.url,
      size: buffer.length,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Tiempo agotado al acceder a la URL' });
    }
    console.error('[extract-image] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Error al extraer imagen' });
  }
});

module.exports = router;
