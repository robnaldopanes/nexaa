const express = require('express');
const cors = require('cors');
const path = require('path');

try { require('dotenv').config({ path: path.resolve(__dirname, '../../frontend/.env.local') }); } catch {}
try { require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); } catch {}
try { require('dotenv').config(); } catch {}

const newsRoutes = require('./routes/news');
const photosRoutes = require('./routes/photos');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const adsRoutes = require('./routes/ads');
const rssRoutes = require('./routes/rss');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('AI Engine:', process.env.GOOGLE_AI_API_KEY ? 'Gemini configurado' : (process.env.OPENAI_API_KEY ? 'OpenAI configurado' : 'Demo'));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/news', newsRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/rss', rssRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NEXAA Backend running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
