import { supabase } from './supabaseClient'
import type { Prestamo } from '../types/supabase'
import { updateEquipoEstado } from './equipos'

// Obtener préstamos activos directamente
export async function getPrestamosActivos(): Promise<Prestamo[]> {
  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .eq('estado', 'prestado')
    .eq('is_deleted', false)
    .order('fecha_prestamo', { ascending: false })
  if (error || !data) return []
  return data
}

// Obtener todos los préstamos directamente
export async function getTodosPrestamos(): Promise<Prestamo[]> {
  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .eq('is_deleted', false)
    .order('fecha_prestamo', { ascending: false })
  if (error || !data) return []
  return data
}

// Escuchar préstamos activos en tiempo real (estado = 'prestado') con refresco continuo
export function listenPrestamosActivos(cb: (prestamos: Prestamo[]) => void) {
  const fetchActivos = () => {
    supabase
      .from('prestamos')
      .select('*')
      .eq('estado', 'prestado')
      .eq('is_deleted', false)
      .order('fecha_prestamo', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching active prestamos:', error)
        }
      })
  }

  fetchActivos()

  const channelId = 'prestamos_activos_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'prestamos' },
      () => {
        fetchActivos()
      }
    )
    .subscribe()

  // Sondeo preventivo cada 5 segundos para sincronización entre dispositivos
  const timer = setInterval(fetchActivos, 5000)
  const onFocus = () => fetchActivos()
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
    window.addEventListener('visibilitychange', onFocus)
  }

  return () => {
    clearInterval(timer)
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('visibilitychange', onFocus)
    }
    supabase.removeChannel(channel)
  }
}

// Escuchar todos los préstamos en tiempo real con refresco continuo
export function listenTodosPrestamos(cb: (prestamos: Prestamo[]) => void) {
  const fetchTodos = () => {
    supabase
      .from('prestamos')
      .select('*')
      .eq('is_deleted', false)
      .order('fecha_prestamo', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching all prestamos:', error)
        }
      })
  }

  fetchTodos()

  const channelId = 'prestamos_todos_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'prestamos' },
      () => {
        fetchTodos()
      }
    )
    .subscribe()

  // Sondeo preventivo cada 5 segundos para sincronización entre dispositivos
  const timer = setInterval(fetchTodos, 5000)
  const onFocus = () => fetchTodos()
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
    window.addEventListener('visibilitychange', onFocus)
  }

  return () => {
    clearInterval(timer)
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('visibilitychange', onFocus)
    }
    supabase.removeChannel(channel)
  }
}

// Evitar registrar duplicado de préstamo para un equipo que ya esté prestado
export async function preventDuplicateLoan(equipoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('prestamos')
    .select('id')
    .eq('equipo_id', equipoId)
    .eq('estado', 'prestado')
    .eq('is_deleted', false)
    .limit(1)

  if (error) {
    console.error('Error checking duplicate loan:', error)
    return false
  }
  return !data || data.length === 0
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PERSONAL_LOAN_UUID = '00000000-0000-0000-0000-000000000000'

async function resolveLugarNombre(lugarId?: string | null, responsable?: string | null, observaciones?: string | null): Promise<string> {
  if (!lugarId || lugarId === 'personal' || lugarId === PERSONAL_LOAN_UUID || observaciones?.startsWith('[PERSONAL]')) {
    return `Préstamo Personal (${responsable?.trim() || 'Sin asignar'})`
  }
  if (!UUID_REGEX.test(lugarId)) {
    return lugarId
  }
  try {
    const { data: lugarData } = await supabase
      .from('lugares')
      .select('nombre')
      .eq('id', lugarId)
      .maybeSingle()
    if (lugarData?.nombre) {
      return lugarData.nombre
    }
  } catch (err) {
    console.warn('Error resolviendo nombre de lugar:', err)
  }
  return 'Lugar'
}

async function resolveEquipoCodigo(equipoId?: string | null): Promise<string> {
  if (!equipoId) return 'Equipo'
  if (!UUID_REGEX.test(equipoId)) return equipoId
  try {
    const { data: eqData } = await supabase
      .from('equipos')
      .select('codigo_unico')
      .eq('id', equipoId)
      .maybeSingle()
    if (eqData?.codigo_unico) {
      return eqData.codigo_unico
    }
  } catch (err) {
    console.warn('Error resolviendo código de equipo:', err)
  }
  return equipoId
}

// Crear un préstamo
export async function createPrestamo(data: Omit<Prestamo, 'id' | 'is_deleted'>) {
  // 1. Obtener nombre del lugar para trazabilidad
  const lugarNombre = await resolveLugarNombre(data.lugar_id, data.responsable, data.observaciones)

  // 2. Obtener código único del equipo
  const equipoCodigo = await resolveEquipoCodigo(data.equipo_id)

  // 3. Obtener usuario responsable
  const { data: authData } = await supabase.auth.getUser()
  let userShortName = 'Usuario'
  if (authData?.user?.id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('short_name')
      .eq('id', authData.user.id)
      .maybeSingle()
    if (prof?.short_name) {
      userShortName = prof.short_name
    }
  }

  const { error } = await supabase
    .from('prestamos')
    .insert([
      {
        lugar_id: data.lugar_id,
        equipo_id: data.equipo_id,
        cantidad: data.cantidad || 1,
        responsable: data.responsable || '',
        fecha_prestamo: data.fecha_prestamo || new Date().toISOString(),
        fecha_devolucion: null,
        estado: 'prestado',
        observaciones: data.observaciones || null,
        is_deleted: false,
      },
    ])

  if (error) {
    throw error
  }

  // Cambiar el estado del equipo a 'en_uso' con la ubicación del lugar
  await updateEquipoEstado(data.equipo_id, 'en_uso', lugarNombre)

  // Registrar log de auditoría explícito para asegurar que Bitácora y Auditoría muestren el lugar de inmediato
  try {
    await supabase.from('audit_logs').insert([
      {
        user_id: authData?.user?.id || null,
        user_short_name: userShortName,
        module: 'prestamos',
        action_type: 'Préstamo registrado',
        details: `Equipo ${equipoCodigo} pasó a "en_uso" en ${lugarNombre} (responsable: ${data.responsable || 'General'})`,
        timestamp: new Date().toISOString(),
      },
    ])
  } catch (logErr) {
    console.warn('Error registrando log de auditoría:', logErr)
  }
}

// Marcar devolución de un préstamo
export async function marcarDevolucion(prestamoId: string) {
  // 1. Obtener detalles del préstamo para saber qué equipo devolver y su lugar de origen
  const { data: prestamo, error: getError } = await supabase
    .from('prestamos')
    .select('equipo_id, lugar_id, responsable, observaciones')
    .eq('id', prestamoId)
    .single()

  if (getError || !prestamo) {
    throw getError || new Error('Préstamo no encontrado')
  }

  // 2. Resolver nombres amigables
  const lugarNombre = await resolveLugarNombre(prestamo.lugar_id, prestamo.responsable, prestamo.observaciones)
  const equipoCodigo = await resolveEquipoCodigo(prestamo.equipo_id)

  // 3. Marcar préstamo como devuelto
  const { error: updateError } = await supabase
    .from('prestamos')
    .update({
      estado: 'devuelto',
      fecha_devolucion: new Date().toISOString(),
    })
    .eq('id', prestamoId)

  if (updateError) {
    throw updateError
  }

  // 4. Cambiar el estado del equipo a 'disponible' (ubicación liberada)
  await updateEquipoEstado(prestamo.equipo_id, 'disponible', 'Pañol / Depósito')

  // 5. Registrar log de auditoría explícito con el lugar para asegurar que Bitácora y Auditoría lo muestren de inmediato
  try {
    const { data: authData } = await supabase.auth.getUser()
    let userShortName = 'Usuario'
    if (authData?.user?.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('short_name')
        .eq('id', authData.user.id)
        .maybeSingle()
      if (prof?.short_name) {
        userShortName = prof.short_name
      }
    }

    await supabase.from('audit_logs').insert([
      {
        user_id: authData?.user?.id || null,
        user_short_name: userShortName,
        module: 'prestamos',
        action_type: 'Devolución de equipo',
        details: `Equipo ${equipoCodigo} pasó a "disponible" desde ${lugarNombre}`,
        timestamp: new Date().toISOString(),
      },
    ])
  } catch (logErr) {
    console.warn('Error registrando log de auditoría:', logErr)
  }
}
