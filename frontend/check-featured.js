const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno de Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeatured() {
  const { data, error } = await supabase
    .from('news')
    .select('id, title, is_featured, is_approved, is_published, comuna')
    .eq('is_featured', true);

  if (error) {
    console.error("Error al consultar:", error.message);
  } else {
    console.log("Noticias Destacadas Totales en Supabase:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkFeatured();
