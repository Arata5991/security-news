import { createClient } from '@supabase/supabase-js';

// Project URL と Publishable(anon) key は .env(ビルド時にVite経由で埋め込まれる)から取得する
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
