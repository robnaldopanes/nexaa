function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTitleKeywords(text, minLength = 4) {
  return normalizeText(text)
    .split(' ')
    .filter(w => w.length >= minLength)
    .filter(w => !['para', 'como', 'esta', 'este', 'esto', 'sobre', 'desde', 'hacia', 'entre', 'hasta', 'pero', 'cada', 'todo', 'mismo', 'durante', 'donde'].includes(w));
}

function similarityScore(text1, text2) {
  const words1 = new Set(getTitleKeywords(text1));
  const words2 = new Set(getTitleKeywords(text2));
  if (words1.size === 0 || words2.size === 0) return 0;
  const intersection = [...words1].filter(w => words2.has(w)).length;
  return intersection / Math.max(words1.size, words2.size);
}

function sameURL(url1, url2) {
  if (!url1 || !url2) return false;
  try {
    const a = new URL(url1);
    const b = new URL(url2);
    return a.hostname === b.hostname && a.pathname === b.pathname;
  } catch {
    return url1.trim() === url2.trim();
  }
}

async function checkDuplicate(item, supabase) {
  if (!supabase) return false;

  try {
    // 1) Misma URL en inbox
    if (item.source_url) {
      const { data: urlMatch } = await supabase
        .from('news_inbox')
        .select('id')
        .eq('source_url', item.source_url)
        .limit(1);
      if (urlMatch?.length) return true;
    }

    // 2) URL ya publicada en noticias
    if (item.source_url) {
      const { data: pubMatch } = await supabase
        .from('news')
        .select('id')
        .eq('source_url', item.source_url)
        .limit(1);
      if (pubMatch?.length) return true;
    }

    // 3) Título similar en inbox (umbral 50%)
    const searchTitle = item.title.slice(0, 80);
    const { data: titleMatches } = await supabase
      .from('news_inbox')
      .select('id, title')
      .or(`title.ilike.%${searchTitle.slice(0, 30)}%`)
      .limit(5);

    if (titleMatches) {
      for (const existing of titleMatches) {
        const sim = similarityScore(item.title, existing.title);
        if (sim > 0.5) return true;
      }
    }

    // 4) Título similar en noticias publicadas (evita repetir de otros medios)
    const { data: publishedMatches } = await supabase
      .from('news')
      .select('id, title')
      .or(`title.ilike.%${searchTitle.slice(0, 30)}%`)
      .limit(5);

    if (publishedMatches) {
      for (const existing of publishedMatches) {
        const sim = similarityScore(item.title, existing.title);
        if (sim > 0.5) return true;
      }
    }

    // 5) Contenido/resumen similar en noticias publicadas
    if (item.summary && item.summary.length > 30) {
      const searchSummary = item.summary.slice(0, 50);
      const { data: summaryMatches } = await supabase
        .from('news')
        .select('id, summary')
        .or(`summary.ilike.%${searchSummary.slice(0, 30)}%`)
        .limit(3);

      if (summaryMatches) {
        for (const existing of summaryMatches) {
          const sim = similarityScore(item.summary, existing.summary || '');
          if (sim > 0.6) return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

async function markDuplicate(item, duplicateOfId, supabase) {
  if (!supabase) return;
  try {
    await supabase.from('news_inbox').insert({
      ...item,
      is_duplicate: true,
      duplicate_of: duplicateOfId,
      status: 'ignored',
    });
  } catch { /* silencioso */ }
}

module.exports = { checkDuplicate, markDuplicate, similarityScore, sameURL };
