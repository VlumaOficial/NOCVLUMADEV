import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bvzsupmekthkxpjofavf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2enN1cG1la3Roa3hwam9mYXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzcxNTEsImV4cCI6MjA5MzgxMzE1MX0.SL6UV7Un7HtffSobXYM8FO0MU_64MK8w_9sOanDCpDY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
