const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data: featured, error } = await supabase
      .from('news')
      .select('id, title, is_featured, is_approved, is_published, comuna');
    
    if (error) throw error;
    console.log(`Total published news: ${featured.length}`);
    const featuredItems = featured.filter(n => n.is_published && n.is_approved && n.is_featured && n.comuna !== 'Nacional');
    console.log(`Found ${featuredItems.length} featured regional articles:`);
    featuredItems.forEach((n, idx) => {
      console.log(`#${idx + 1}: id="${n.id}" title="${n.title}" comuna="${n.comuna}"`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
