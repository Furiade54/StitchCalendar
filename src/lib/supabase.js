
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validamos que existan las variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials not found in .env file.');
  throw new Error('Supabase credentials missing. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Validar formato de URL
try {
  new URL(supabaseUrl);
} catch (e) {
  throw new Error(`Invalid Supabase URL: ${supabaseUrl}. Check your .env file.`);
}

// Validar que no sean placeholders comunes
if (supabaseUrl.includes('your-project') || supabaseUrl.includes('example.com')) {
    throw new Error('Supabase URL appears to be a placeholder. Please update .env with your actual Supabase URL.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
