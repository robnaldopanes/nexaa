const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const HAS_VALID_CONFIG = supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('your-project');

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (err) {
  console.warn('Supabase: No se pudo inicializar el cliente. La persistencia no estará disponible.');
  supabase = null;
}

module.exports = { supabase, HAS_VALID_CONFIG };
