import { supabase } from './supabaseClient'
import type { Equipo } from '../types/supabase'

// Buscar equipo por código único
export async function getEquipoByCodigo(codigoUnico: string): Promise<Equipo | null> {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .eq('codigo_unico', codigoUnico.trim().toUpperCase())
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    console.error('Error in getEquipoByCodigo:', error)
    return null
  }
  return data
}

// Asegurar que el código sea único (no se repita)
export async function ensureUniqueCodigo(codigoUnico: string): Promise<boolean> {
  const equipo = await getEquipoByCodigo(codigoUnico)
  return !equipo
}

// Crear un equipo en el catálogo
export async function createEquipo(id: string, data: Omit<Equipo, 'id' | 'is_deleted'>): Promise<void> {
  const insertPayload: Record<string, any> = {
    id: id || undefined,
    codigo_unico: data.codigo_unico.trim().toUpperCase(),
    nombre: data.nombre.trim(),
    tipo: data.tipo,
    marca: data.marca?.trim() || null,
    modelo: data.modelo?.trim() || null,
    numero_serie: data.numero_serie?.trim() || null,
    estado: data.estado || 'disponible',
    estado_otro: data.estado_otro || null,
    ubicacion_actual: data.ubicacion_actual || '',
    is_deleted: false,
  }

  if (data.personal_a_cargo) {
    insertPayload.personal_a_cargo = data.personal_a_cargo.trim()
  }

  const { error } = await supabase.from('equipos').insert([insertPayload])

  if (error) {
    // Si la columna personal_a_cargo aún no existe en Supabase (PGRST204), guardamos el equipo sin ese campo
    if (error.code === 'PGRST204' && insertPayload.personal_a_cargo) {
      delete insertPayload.personal_a_cargo
      const { error: retryError } = await supabase.from('equipos').insert([insertPayload])
      if (retryError) throw retryError
      return
    }
    throw error
  }
}

// Obtener un equipo por ID
export async function getEquipoById(id: string): Promise<Equipo | null> {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    console.error('Error in getEquipoById:', error)
    return null
  }
  return data
}

// Obtener múltiples equipos por ID
export async function getEquiposByIds(ids: string[]): Promise<Map<string, Equipo>> {
  const result = new Map<string, Equipo>()
  if (!ids.length) return result

  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .in('id', ids)
    .eq('is_deleted', false)

  if (error) {
    console.error('Error in getEquiposByIds:', error)
    return result
  }

  if (data) {
    for (const eq of data) {
      result.set(eq.id, eq)
    }
  }
  return result
}

// Actualizar estado del equipo
export async function updateEquipoEstado(id: string, estado: Equipo['estado']): Promise<void> {
  const { error } = await supabase
    .from('equipos')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

// Obtener lista completa de equipos activos
export async function getEquipos(): Promise<Equipo[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data
}

// Escuchar lista de equipos en tiempo real
export function listenEquipos(cb: (equipos: Equipo[]) => void): () => void {
  const fetchEquipos = () => {
    getEquipos().then(cb)
  }

  fetchEquipos()

  const channelId = 'equipos_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'equipos' },
      () => {
        fetchEquipos()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Editar campos del equipo
export async function updateEquipo(id: string, data: Partial<Omit<Equipo, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>>): Promise<void> {
  const cleanData: Record<string, any> = { ...data, updated_at: new Date().toISOString() }
  const { error } = await supabase
    .from('equipos')
    .update(cleanData)
    .eq('id', id)

  if (error) {
    if (error.code === 'PGRST204' && cleanData.personal_a_cargo) {
      delete cleanData.personal_a_cargo
      const { error: retryError } = await supabase
        .from('equipos')
        .update(cleanData)
        .eq('id', id)
      if (retryError) throw retryError
      return
    }
    throw error
  }
}

// Eliminar equipo (Baja Lógica)
export async function deleteEquipo(id: string): Promise<void> {
  const { error } = await supabase
    .from('equipos')
    .update({ is_deleted: true, estado: 'de_baja', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

// Obtener historial de trazabilidad de un equipo específico
export async function getEquipmentHistory(equipoId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('equipment_history')
    .select(`
      *,
      user:profiles(short_name)
    `)
    .eq('equipo_id', equipoId)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching equipment history:', error)
    return []
  }
  return data || []
}

// Obtener historial de asignaciones de un responsable / personal
export async function getPersonalAssignmentHistory(name: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('equipment_history')
    .select(`
      *,
      equipo:equipos(codigo_unico, nombre)
    `)
    .or(`previous_location.ilike.%${name}%,new_location.ilike.%${name}%`)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching personal history:', error)
    return []
  }
  return data || []
}

