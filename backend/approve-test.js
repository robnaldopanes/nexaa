const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('Fetching pending items from news_inbox...');
    const { data: inboxItems, error } = await supabase
      .from('news_inbox')
      .select('*')
      .eq('status', 'pending')
      .limit(3);

    if (error) throw error;

    if (!inboxItems || inboxItems.length === 0) {
      console.log('No pending items found in news_inbox!');
      return;
    }

    console.log(`Found ${inboxItems.length} pending items. Approving them...`);

    for (const item of inboxItems) {
      console.log(`Approving: "${item.title}"`);
      await approveItem(item.id);
    }

    console.log('Verifying news table row count...');
    const { data: news, error: newsError } = await supabase.from('news').select('*');
    if (newsError) throw newsError;
    console.log(`Successfully verified! News table now contains ${news.length} published articles!`);
    
    // Log details of the published articles
    news.forEach((n, idx) => {
      console.log(`Article #${idx + 1}: slug="${n.slug}" category="${n.category}" comuna="${n.comuna}"`);
    });

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

function approveItem(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/rss/${id}/approve`,
      method: 'POST',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`Successfully approved item ${id}`);
          resolve();
        } else {
          console.error(`Failed to approve item ${id}: HTTP ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

run();
