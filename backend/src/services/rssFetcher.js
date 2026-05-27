const Parser = require('rss-parser');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'NEXAA-RSS-Bot/1.0' },
});

const RSS_FEEDS = [
  // Medios regionales Ñuble
  { name: 'La Discusión', url: 'https://www.ladiscusion.cl/feed/', region: 'Ñuble' },
  { name: 'Crónica Chillán', url: 'https://www.cronicachillan.cl/feed/', region: 'Ñuble' },
  { name: 'Radio Ñuble', url: 'https://www.radionuble.cl/feed/', region: 'Ñuble' },
  // Medios nacionales con cobertura Ñuble
  { name: 'BioBioChile Ñuble', url: 'https://www.biobiochile.cl/lista/categorias/region-nuble/rss', region: 'Ñuble' },
  { name: 'SoyChile Ñuble', url: 'https://www.soychile.cl/rss/nuble', region: 'Ñuble' },
  { name: 'EMOL Nacional', url: 'https://www.emol.com/rss/nacional.xml', region: 'Nacional' },
  { name: 'Cooperativa', url: 'https://www.cooperativa.cl/noticias/site/tax/port/rss_3_20___1.xml', region: 'Nacional' },
  // Municipales
  { name: 'Muni Chillán', url: 'https://www.municipalidadchillan.cl/feed/', region: 'Ñuble' },
  { name: 'Muni San Carlos', url: 'https://www.sancarlos.cl/feed/', region: 'Ñuble' },
  // Google News - Ñuble (múltiples búsquedas)
  { name: 'Google News Ñuble', url: 'https://news.google.com/rss/search?q=%C3%91uble+Chile&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  { name: 'Google News Chillán', url: 'https://news.google.com/rss/search?q=Chill%C3%A1n&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  { name: 'Google News San Carlos', url: 'https://news.google.com/rss/search?q=San+Carlos+%C3%91uble&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  { name: 'Google News Quillón', url: 'https://news.google.com/rss/search?q=Quill%C3%B3n&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  // Emergencias Ñuble
  { name: 'Google News Emergencias Ñuble', url: 'https://news.google.com/rss/search?q=incendio+forestal+%C3%91uble&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  { name: 'Google News Bomberos Chillán', url: 'https://news.google.com/rss/search?q=Bomberos+Chill%C3%A1n&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  { name: 'Google News Emergencia Ñuble', url: 'https://news.google.com/rss/search?q=emergencia+%C3%91uble+Chile&hl=es-419&gl=CL&ceid=CL:es-419', region: 'Ñuble' },
  // Oficiales
  { name: 'Gobierno Regional Ñuble', url: 'https://www.goredenuble.cl/feed/', region: 'Ñuble' },
  { name: 'Delegación Presidencial Ñuble', url: 'https://www.dprnuble.cl/feed/', region: 'Ñuble' },
  // Otros
  { name: 'Radio Bío Bío', url: 'https://feeds.biobiochile.cl/rss', region: 'Nacional' },
];

function cleanEllipsisText(text) {
  if (!text) return '';
  return text
    .replace(/\[\s*&#8230;\s*\]/g, '')
    .replace(/\[\s*&hellip;\s*\]/g, '')
    .replace(/&#8230;/g, '')
    .replace(/&hellip;/g, '')
    .replace(/\[\s*\.\.\.\s*\]/g, '')
    .replace(/\[\s*…\s*\]/g, '')
    .replace(/\s*[…\.]+\s*$/, '')
    .trim();
}

function normalizeItem(item, feed) {
  const title = (item.title || '').trim()
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, '-')
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&');

  const rawSummary = (item.contentSnippet || item.content || item.summary || '').trim();
  const summary = cleanEllipsisText(rawSummary).slice(0, 250);

  const rawContent = (item.content || item['content:encoded'] || item.summary || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const content = cleanEllipsisText(rawContent).slice(0, 5000);

  return {
    title,
    source: feed.name,
    source_url: item.link || item.guid || null,
    image_url: item.enclosure?.url || extractImageFromContent(item.content || item['content:encoded'] || '') || null,
    summary,
    content,
    category: item.categories?.[0] || 'Regional',
    detected_at: item.pubDate || item.isoDate || new Date().toISOString(),
    _feed_region: feed.region,
  };
}

function extractImageFromContent(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) {
    const src = match[1];
    const isGoogleImage = src.includes('googleusercontent.com') || 
                          src.includes('google.com') || 
                          src.includes('gstatic.com');
    if (!isGoogleImage) {
      return src;
    }
  }
  return null;
}

async function fetchAllFeeds() {
  const articles = [];
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, 10).map(item => normalizeItem(item, feed));
      articles.push(...items);
      console.log(`RSS: ${feed.name} → ${items.length} artículos`);
    } catch (err) {
      console.warn(`RSS ${feed.name} error: ${err.message}`);
    }
  }
  return articles;
}

async function scrapeWebPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NEXAA-Scraper/1.0' },
      timeout: 10000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Obtener título de la página
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text() || 'Sin título';

    // Limpiar elementos no deseados para extraer el contenido limpio
    $('script, style, nav, footer, iframe, noscript, header, .sidebar, #comments').remove();

    // Extraer párrafos con longitud significativa
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 35) paragraphs.push(text);
    });

    const content = paragraphs.join('\n\n') || $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500);

    return {
      title: title.trim(),
      content: content.trim().slice(0, 3000),
      sourceUrl: url,
    };
  } catch (err) {
    console.error(`Scraper error for ${url}:`, err.message);
    return null;
  }
}

async function fetchSingleFeed(url) {
  try {
    const parsed = await parser.parseURL(url);
    return (parsed.items || []).slice(0, 10);
  } catch {
    return [];
  }
}

module.exports = { fetchAllFeeds, fetchSingleFeed, RSS_FEEDS, scrapeWebPage };
