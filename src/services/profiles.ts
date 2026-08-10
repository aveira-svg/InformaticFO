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

  const channel = supabase
    .channel('public:profiles')
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
    email_confirm: true, // Confirmado por defecto
    user_metadata: {
      short_name: shortName.trim(),
      role: role
    }
  })

  if (error) {
    throw error
  }

  return data.user
}
