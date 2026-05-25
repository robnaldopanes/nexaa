const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase keys missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('news').select('category, title').limit(50);
  if (error) {
    console.error('Error fetching:', error.message);
    return;
  }
  console.log('--- CATEGORÍAS EN LA BASE DE DATOS ---');
  const counts = {};
  data.forEach(item => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    console.log(`- Noticia: "${item.title.substring(0, 40)}..." -> Categoría: "${item.category}"`);
  });
  console.log('\nResumen de frecuencias:');
  console.log(counts);
}

check();
