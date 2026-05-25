const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data: news, error } = await supabase.from('news').select('id, title, image_url, category');
    if (error) throw error;
    console.log(`Found ${news.length} articles:`);
    news.forEach((n, idx) => {
      console.log(`Article #${idx + 1}: id="${n.id}" title="${n.title.slice(0, 30)}..." image_url="${n.image_url}" category="${n.category}"`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
