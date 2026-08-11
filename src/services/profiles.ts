import { supabase, getSupabaseAdmin } from './supabaseClient'
import type { Profile } from '../types/supabase'

// Escuchar perfiles activos en tiempo real (excluyendo eliminados)
export function listenProfiles(cb: (profiles: Profile[]) => void) {
  const fetchProfiles = () => {
    supabase
      .from('profiles')
      .select('*')
      .eq('is_deleted', false)
      .order('short_name')
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching profiles:', error)
        }
      })
  }

  fetchProfiles()

  const channelId = 'profiles_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => {
        fetchProfiles()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Actualizar perfil de usuario (nombre corto o rol)
export async function updateProfile(userId: string, data: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw error
  }
}

// Promocionar un usuario a admin usando la clave de servicio
export async function promoteToAdmin(userId: string) {
  const secretKey =
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNua2h6Z2lmY3ZwdnNxeHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM0NDY4NSwiZXhwIjoyMTAxOTIwNjg1fQ.a2YvsH7Z3vEOWJvYqka7AaQVTkZEnxrJB2FxoCz9fR0'
  const adminClient = getSupabaseAdmin(secretKey)
  const { error } = await adminClient
    .from('profiles')
    .update({ role: 'admin', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw error
  }
}

// Dar de baja lógica a un usuario
export async function deleteProfile(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw error
  }
}

// Crear un usuario desde el panel del Administrador (usando service_role key)
export async function adminCreateUser(
  email: string,
  password: string,
  shortName: string,
  role: 'admin' | 'user',
  serviceRoleKey: string
) {
  const adminClient = getSupabaseAdmin(serviceRoleKey)

  // 1. Crear el usuario en auth.users
  const { data, error } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password: password,
    email_confirm: true,
    user_metadata: {
      short_name: shortName.trim(),
      role: role,
    },
  })

  if (error) {
    throw error
  }

  return data.user
}
