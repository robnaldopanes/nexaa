const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const { generateSummary, detectDuplicate } = require('../services/openai');
const { fetchAllFeeds, scrapeWebPage } = require('../services/rssFetcher');
const { checkDuplicate } = require('../services/duplicateFilter');

router.get('/', async (req, res) => {
  try {
    const { category, comuna, featured, limit = 20, offset = 0 } = req.query;
    let query = supabase
      .from('news')
      .select('id,title,summary,image_url,category,comuna,is_featured,is_breaking,published_at,source_name,slug,views')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category) query = query.eq('category', category);
    if (comuna) query = query.eq('comuna', comuna);
    if (featured) query = query.eq('is_featured', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('id,title,summary,content,image_url,category,comuna,is_featured,is_breaking,published_at,source_name,source_url,slug,views,tags,ai_generated')
      .eq('slug', req.params.slug)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const { data: current } = await supabase
      .from('news')
      .select('views')
      .eq('id', req.params.id)
      .single();

    const newViews = (current?.views || 0) + 1;
    const { data, error } = await supabase
      .from('news')
      .update({ views: newViews })
      .eq('id', req.params.id)
      .select('views')
      .single();

    if (error) throw error;
    res.json({ views: data.views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auto-fetch', async (req, res) => {
  try {
    const articles = await fetchAllFeeds();
    const results = [];

    for (const article of articles) {
      const isDuplicate = await detectDuplicate(article.title, supabase);
      if (isDuplicate) continue;

      const aiResult = await generateSummary(article.title, article.content, article.link);

      const slug = aiResult.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);

      const { data, error } = await supabase
        .from('news')
        .insert({
          title: aiResult.title,
          summary: aiResult.summary,
          content: article.content,
          image_url: article.imageUrl,
          source_url: article.link,
          source_name: article.sourceName,
          category: aiResult.category,
          comuna: aiResult.comuna || null,
          tags: aiResult.tags,
          slug,
          ai_generated: true,
          is_approved: false,
          is_published: false,
          published_at: article.pubDate || new Date().toISOString(),
        })
        .select()
        .single();

      if (!error) results.push(data);
    }

    res.json({ message: `Fetched ${articles.length} articles, ${results.length} new`, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const scraped = await scrapeWebPage(url);
    if (!scraped) return res.status(400).json({ error: 'Could not scrape URL' });

    const aiResult = await generateSummary(scraped.title, scraped.content, url);

    res.json({
      original: scraped,
      generated: aiResult,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .insert({ ...req.body, ai_generated: false })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
