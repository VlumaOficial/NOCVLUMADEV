import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bvzsupmekthkxpjofavf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2enN1cG1la3Roa3Bqb2ZhdmYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NjgwMzQ2NSwiZXhwIjoyMDYyMzc5NDY1fQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
