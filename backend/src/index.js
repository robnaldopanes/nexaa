console.log('=== NEXAA BACKEND STARTING ===');
console.log('Node version:', process.version);
console.log('PORT env:', process.env.PORT);
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);

const express = require('express');
const cors = require('cors');
const path = require('path');

try { require('dotenv').config({ path: path.resolve(__dirname, '../../frontend/.env.local') }); } catch {}
try { require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); } catch {}
try { require('dotenv').config(); } catch {}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas con manejo de errores por si algún módulo falla
try { app.use('/api/news', require('./routes/news')); } catch(e) { console.warn('news route failed:', e.message); }
try { app.use('/api/photos', require('./routes/photos')); } catch(e) { console.warn('photos route failed:', e.message); }
try { app.use('/api/auth', require('./routes/auth')); } catch(e) { console.warn('auth route failed:', e.message); }
try { app.use('/api/ai', require('./routes/ai')); } catch(e) { console.warn('ai route failed:', e.message); }
try { app.use('/api/ads', require('./routes/ads')); } catch(e) { console.warn('ads route failed:', e.message); }
try { app.use('/api/rss', require('./routes/rss')); } catch(e) { console.warn('rss route failed:', e.message); }
try { app.use('/api/upload', require('./routes/upload')); } catch(e) { console.warn('upload route failed:', e.message); }

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NEXAA Backend running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
