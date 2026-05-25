const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to:', supabaseUrl);
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or keys are missing in env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data: news, error } = await supabase.from('news').select('*').limit(1);
    if (error) {
      console.error('Error selecting from news table:', error.message);
      console.log('Maybe the schema is not run yet in the SQL Editor?');
    } else {
      console.log('Successfully connected! News table exists. Found rows:', news.length);
    }
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

test();
