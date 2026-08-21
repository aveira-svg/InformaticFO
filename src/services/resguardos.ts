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
  const insertPayload: Record<string, any> = {
    id: id || undefined,
    codigo_unico: data.codigo_unico.trim().toUpperCase(),
    nombre: data.nombre.trim(),
    tipo: data.tipo,
    marca: data.marca?.trim() || null,
    modelo: data.modelo?.trim() || null,
    numero_serie: data.numero_serie?.trim() || null,
    procesador: data.procesador?.trim() || null,
    memoria: data.memoria?.trim() || null,
    gpu: data.gpu?.trim() || null,
    area_o_destino: data.area_o_destino?.trim() || null,
    personal_a_cargo: data.personal_a_cargo?.trim() || null,
    estado: data.estado || 'asignado',
    observaciones: data.observaciones?.trim() || null,
    is_deleted: false,
  }

  let { error } = await supabase.from('resguardos').insert([insertPayload])

  // Fallback si las nuevas columnas no existen aún en la base de datos remota
  if (error && (error.code === 'PGRST204' || String(error.message).includes('schema cache') || String(error.message).includes('column'))) {
    console.warn('Columnas procesador/memoria/gpu no encontradas en BD remota. Reintentando...', error)
    delete insertPayload.procesador
    delete insertPayload.memoria
    delete insertPayload.gpu
    const res = await supabase.from('resguardos').insert([insertPayload])
    error = res.error
  }

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

// Obtener lista completa de resguardos directamente
export async function getResguardos(): Promise<Resguardo[]> {
  const { data, error } = await supabase
    .from('resguardos')
    .select('*')
    .eq('is_deleted', false)
    .order('nombre')

  if (error || !data) {
    return []
  }
  return data
}

// Escuchar lista de resguardos en tiempo real con refresco preventivo
export function listenResguardos(cb: (resguardos: Resguardo[]) => void): () => void {
  const fetchResguardos = () => {
    getResguardos().then(cb)
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

  // Refresco periódico cada 10 segundos
  const timer = setInterval(fetchResguardos, 10000)

  return () => {
    clearInterval(timer)
    supabase.removeChannel(channel)
  }
}

// Editar campos del resguardo
export async function updateResguardo(
  id: string,
  data: Partial<Omit<Resguardo, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const cleanData: Record<string, any> = { ...data, updated_at: new Date().toISOString() }
  let { error } = await supabase
    .from('resguardos')
    .update(cleanData)
    .eq('id', id)

  // Fallback si las nuevas columnas no existen aún en la base de datos remota
  if (error && (error.code === 'PGRST204' || String(error.message).includes('schema cache') || String(error.message).includes('column'))) {
    console.warn('Columnas procesador/memoria/gpu no encontradas en BD remota al actualizar. Reintentando...', error)
    delete cleanData.procesador
    delete cleanData.memoria
    delete cleanData.gpu
    const res = await supabase
      .from('resguardos')
      .update(cleanData)
      .eq('id', id)
    error = res.error
  }

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

// Registrar entrada de trazabilidad
export async function logResguardoHistory(entry: {
  resguardo_id: string
  action_type: 'creacion' | 'edicion' | 'baja' | 'asignacion' | 'reparacion'
  previous_state?: string | null
  new_state?: string | null
  previous_location?: string | null
  new_location?: string | null
  details?: string | null
  user_id?: string | null
}): Promise<void> {
  try {
    let uid = entry.user_id
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data?.user?.id || null
    }

    await supabase.from('resguardo_history').insert([
      {
        resguardo_id: entry.resguardo_id,
        user_id: uid,
        action_type: entry.action_type,
        previous_state: entry.previous_state || null,
        new_state: entry.new_state || null,
        previous_location: entry.previous_location || null,
        new_location: entry.new_location || null,
        details: entry.details || null,
        timestamp: new Date().toISOString(),
      },
    ])
  } catch (err) {
    console.warn('Error recording resguardo history:', err)
  }
}

// Escuchar cambios en el historial de trazabilidad en tiempo real
export function listenResguardoHistory(resguardoId: string, cb: (logs: any[]) => void): () => void {
  const fetchHistory = () => {
    getResguardoHistory(resguardoId).then(cb)
  }

  fetchHistory()

  const channelId = `resguardo_history_${resguardoId}_` + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'resguardo_history', filter: `resguardo_id=eq.${resguardoId}` },
      () => {
        fetchHistory()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

