import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ywmsnkhzgifcvpvsqxyg.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNua2h6Z2lmY3ZwdnNxeHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDQ2ODUsImV4cCI6MjEwMTkyMDY4NX0.oIEncwunkTLJXRfyvONQlx6F1kcNqLFnGdqhKlFZNuc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para inicializar cliente de administración con la Service Role Key para operaciones de admin (ej: crear usuario)
export function getSupabaseAdmin(serviceRoleKey?: string) {
  const key =
    serviceRoleKey ||
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNua2h6Z2lmY3ZwdnNxeHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM0NDY4NSwiZXhwIjoyMTAxOTIwNjg1fQ.a2YvsH7Z3vEOWJvYqka7AaQVTkZEnxrJB2FxoCz9fR0'

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
