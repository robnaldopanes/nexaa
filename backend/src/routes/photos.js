const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');

// 1. GET: obtener fotos (con opción de approved y featured)
router.get('/', async (req, res) => {
  try {
    const { featured, approved, limit = 100 } = req.query;
    let query = supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(Number(limit));
    
    if (featured) query = query.eq('is_featured', true);
    if (approved) query = query.eq('is_approved', approved === 'true');
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET: obtener solicitudes de fotos pendientes (admin)
router.get('/submissions', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { data, error } = await supabase
      .from('user_submissions')
      .select('*')
      .eq('type', 'photo')
      .eq('status', status)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST: crear foto (o aprobar)
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('photos').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PUT: actualizar foto (por ejemplo, destacar)
router.put('/:id', async (req, res) => {
  try {
    // Si se está marcando como destacada, quitamos el destacado de las otras
    if (req.body.is_featured === true) {
      await supabase
        .from('photos')
        .update({ is_featured: false })
        .neq('id', req.params.id);
    }
    
    const { data, error } = await supabase
      .from('photos')
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

// 5. PUT: actualizar estado de una solicitud (submissions)
router.put('/submissions/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('user_submissions')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE: eliminar foto de la galería
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.json({ success: true, message: 'Foto eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
