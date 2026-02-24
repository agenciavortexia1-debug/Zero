import { createClient } from '@supabase/supabase-js';

// Detect environment variables from both Vite and process.env (defined in vite.config.ts)
// Fallback to hardcoded values if environment variables are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || 
                    'https://golgewgoutsmqqmyione.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbGdld2dvdXRzbXFxbXlpb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTE5MDAsImV4cCI6MjA4NzUyNzkwMH0.pelEbJcOtfyf3tfuSWsQ9pFTGfcCctwMX4fCwXmWfiM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
