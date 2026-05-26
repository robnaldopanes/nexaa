const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { supabase } = require('../utils/supabase');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Middleware para verificar token admin
function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Login para administrador (simple, basado en env vars)
router.post('/admin-login', (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET no configurado en el servidor' });
    }
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'ADMIN_EMAIL o ADMIN_PASSWORD no configurados' });
    }

    const { email, password } = req.body;
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar token (para el frontend)
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// Rutas de Supabase Auth (si las quieres usar también)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    res.json(data.user);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
module.exports.verifyAdminToken = verifyAdminToken;
