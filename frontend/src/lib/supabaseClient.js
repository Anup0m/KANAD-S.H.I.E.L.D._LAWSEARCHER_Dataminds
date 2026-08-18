import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://szratppndcciyviffxib.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cmF0cHBuZGNjaXl2aWZmeGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjMxMTgsImV4cCI6MjEwMjUzOTExOH0.Sex1JzobrpOtjxJHrklj4nQqS3BoRMF2OSWPj12L7vc"

// Always create the client with fallbacks so .auth is never accessed on null
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
