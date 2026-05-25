const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let openai = null;
let deepseek = null;
let activeAI = 'demo';

const CATEGORY_KEYWORDS = {
  'Emergencias': ['incendio', 'bombero', 'emergencia', 'alerta', 'accidente', 'evacuación', 'sismo', 'temblor', 'inundación'],
  'Deportes': ['partido', 'torneo', 'gol', 'estadio', 'ñublense', 'fútbol', 'deporte', 'campeonato', 'liga'],
  'Política': ['alcalde', 'municipalidad', 'concejo', 'gobernador', 'parlamentario', 'elección', 'votación', 'ley', 'decreto'],
  'Clima': ['lluvia', 'temperatura', 'precipitación', 'meteorología', 'frente', 'helada', 'viento', 'pronóstico'],
  'Economía': ['exportación', 'producción', 'agrícola', 'cosecha', 'comercio', 'economía', 'crecimiento', 'mercado'],
  'Turismo': ['turista', 'turismo', 'visita', 'atractivo', 'nevado', 'termas', 'playa', 'reserva', 'parque nacional'],
  'Cultura': ['exposición', 'cultura', 'artista', 'museo', 'alfarería', 'folclor', 'patrimonio'],
  'Social': ['vecino', 'comunidad', 'pavimentación', 'camino', 'rural', 'celebración', 'inauguración'],
  'Tránsito': ['tránsito', 'corte', 'ruta', 'carretera', 'desvío', 'semáforo', 'accidente vehicular'],
  'Subsidios': ['subsidio', 'bono', 'beneficio', 'ayuda', 'postulación', 'gobierno'],
};

function detectCategory(text) {
  const lower = (text || '').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Regional';
}

function generateDemoTitle(text) {
  const titles = [
    'Ñuble avanza: {tema} marca la pauta regional esta jornada',
    'Atención Ñuble: {tema} genera impacto en la comunidad',
    '{tema}: el tema que moviliza a la Región de Ñuble hoy',
    'Región de Ñuble: {tema} concentra la atención de las autoridades',
  ];
  const words = (text || 'Actualidad regional').split(' ').slice(0, 5).join(' ');
  return titles[Math.floor(Math.random() * titles.length)].replace('{tema}', words);
}

function generateDemoSummary(text) {
  return `La Región de Ñuble se encuentra ante un nuevo escenario relacionado con esta información. Según fuentes locales, el hecho ha generado interés entre los habitantes de la zona, quienes esperan más detalles en las próximas horas. Las autoridades regionales han señalado que se mantendrán atentos al desarrollo de los acontecimientos.`;
}

function generateTags(text) {
  const words = (text || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const unique = [...new Set(words)].slice(0, 5);
  return unique.length ? unique : ['ñuble', 'regional', 'chile', 'noticias'];
}

const COMUNAS_NUBLE = ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Pinto', 'Cobquecura', 'Quillón', 'Coihueco'];

const AI_PROMPT = `Eres un periodista chileno experto en la Región de Ñuble. Genera SOLO un JSON (sin texto adicional) con:
- title: titular periodístico original máximo 100 caracteres
- summary: 2-3 oraciones informativas
- category: una de [Política, Emergencias, Deportes, Subsidios, Tránsito, Clima, Turismo, Economía, Cultura, Social]
- tags: array de 5 etiquetas SEO
- comuna: nombre de comuna de Ñuble relacionada

Texto: "{texto}"

Responde ÚNICAMENTE el JSON.`;

async function askOpenAI(prompt) {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) throw new Error('No OpenAI key');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}

async function askDeepSeek(prompt) {
  if (!deepseek) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'tu-deepseek-key') throw new Error('No DeepSeek key');
    deepseek = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });
  }
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}

async function askGemini(prompt) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey.startsWith('tu-')) throw new Error('No Gemini key');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function parseAIResponse(text) {
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error('Failed to parse AI response');
}

async function generateSummary(title, content, sourceUrl) {
  const combinedText = `${title || ''} ${content || ''}`.slice(0, 3000);
  const prompt = AI_PROMPT.replace('{texto}', combinedText);

  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('tu-')) {
    try {
      const text = await askGemini(prompt);
      return { ...parseAIResponse(text), _engine: 'gemini' };
    } catch (e) {
      console.warn('Gemini error, intentando OpenAI o demo:', e.message);
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && !openaiKey.startsWith('sk-your')) {
    try {
      const text = await askOpenAI(prompt);
      return { ...parseAIResponse(text), _engine: 'openai' };
    } catch (e) {
      console.warn('OpenAI error, usando demo:', e.message);
    }
  }

  // Modo demo
  const category = detectCategory(combinedText);
  const comuna = COMUNAS_NUBLE[Math.floor(Math.random() * COMUNAS_NUBLE.length)];
  await new Promise(r => setTimeout(r, 400));

  return {
    title: generateDemoTitle(combinedText),
    summary: generateDemoSummary(combinedText),
    category,
    tags: generateTags(combinedText),
    comuna,
    _engine: 'demo',
  };
}

async function detectDuplicate(title, supabase) {
  if (!supabase) return false;
  try {
    const { data } = await supabase
      .from('news')
      .select('id')
      .ilike('title', `%${title.slice(0, 30)}%`)
      .limit(1);
    return data && data.length > 0;
  } catch { return false; }
}

module.exports = { generateSummary, detectDuplicate };
