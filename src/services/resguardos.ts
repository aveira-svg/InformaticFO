import { supabase } from './supabaseClient'
import type { Resguardo, EstadoResguardo } from '../types/supabase'

// Buscar resguardo por código único
export async function getResguardoByCodigo(codigoUnico: string): Promise<Resguardo | null> {
  const { data, error } = await supabase
    .from('resguardos')
    .select('*')
    .eq('codigo_unico', codigoUnico.trim().toUpperCase())
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error in getResguardoByCodigo:', error)
    }
    return null
  }
  return data
}

// Asegurar que el código sea único en resguardos
export async function ensureUniqueResguardoCodigo(codigoUnico: string): Promise<boolean> {
  const item = await getResguardoByCodigo(codigoUnico)
  return !item
}

// Crear un resguardo
export async function createResguardo(id: string, data: Omit<Resguardo, 'id' | 'is_deleted'>): Promise<void> {
  const insertPayload = {
    id: id || undefined,
    codigo_unico: data.codigo_unico.trim().toUpperCase(),
    nombre: data.nombre.trim(),
    tipo: data.tipo,
    marca: data.marca?.trim() || null,
    modelo: data.modelo?.trim() || null,
    numero_serie: data.numero_serie?.trim() || null,
    area_o_destino: data.area_o_destino?.trim() || null,
    personal_a_cargo: data.personal_a_cargo?.trim() || null,
    estado: data.estado || 'asignado',
    observaciones: data.observaciones?.trim() || null,
    is_deleted: false,
  }

  const { error } = await supabase.from('resguardos').insert([insertPayload])

  if (error) {
    throw error
  }
}

// Obtener un resguardo por ID
export async function getResguardoById(id: string): Promise<Resguardo | null> {
  const { data, error } = await supabase
    .from('resguardos')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    console.error('Error in getResguardoById:', error)
    return null
  }
  return data
}

// Actualizar estado del resguardo
export async function updateResguardoEstado(id: string, estado: EstadoResguardo): Promise<void> {
  const { error } = await supabase
    .from('resguardos')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

// Escuchar lista de resguardos en tiempo real
export function listenResguardos(cb: (resguardos: Resguardo[]) => void): () => void {
  const fetchResguardos = () => {
    supabase
      .from('resguardos')
      .select('*')
      .eq('is_deleted', false)
      .order('nombre')
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          if (error.code === 'PGRST205' || String(error.message).includes('404') || String(error.code).includes('404')) {
            cb([])
          } else {
            console.error('Error fetching resguardos:', error)
          }
        }
      })
  }

  fetchResguardos()

  const channelId = 'resguardos_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'resguardos' },
      () => {
        fetchResguardos()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Editar campos del resguardo
export async function updateResguardo(
  id: string,
  data: Partial<Omit<Resguardo, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const cleanData = { ...data, updated_at: new Date().toISOString() }
  const { error } = await supabase
    .from('resguardos')
    .update(cleanData)
    .eq('id', id)

  if (error) {
    throw error
  }
}

// Eliminar resguardo (Baja Lógica)
export async function deleteResguardo(id: string): Promise<void> {
  const { error } = await supabase
    .from('resguardos')
    .update({ is_deleted: true, estado: 'de_baja', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

// Obtener historial de trazabilidad de un resguardo específico
export async function getResguardoHistory(resguardoId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('resguardo_history')
    .select(`
      *,
      user:profiles(short_name)
    `)
    .eq('resguardo_id', resguardoId)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching resguardo history:', error)
    return []
  }
  return data || []
}
