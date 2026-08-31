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

// Crear un préstamo
export async function createPrestamo(data: Omit<Prestamo, 'id' | 'is_deleted'>) {
  // 1. Obtener nombre del lugar para trazabilidad
  let lugarNombre = data.lugar_id
  if (data.lugar_id === 'personal') {
    lugarNombre = `Préstamo Personal (${data.responsable || 'Sin asignar'})`
  } else {
    const { data: lugarData } = await supabase
      .from('lugares')
      .select('nombre')
      .eq('id', data.lugar_id)
      .maybeSingle()
    if (lugarData?.nombre) {
      lugarNombre = lugarData.nombre
    }
  }

  // 2. Obtener código único del equipo
  let equipoCodigo = data.equipo_id
  const { data: eqData } = await supabase
    .from('equipos')
    .select('codigo_unico')
    .eq('id', data.equipo_id)
    .maybeSingle()
  if (eqData?.codigo_unico) {
    equipoCodigo = eqData.codigo_unico
  }

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
  // Obtener detalles del préstamo para saber qué equipo devolver y su lugar de origen
  const { data: prestamo, error: getError } = await supabase
    .from('prestamos')
    .select('equipo_id, lugar_id, responsable')
    .eq('id', prestamoId)
    .single()

  if (getError || !prestamo) {
    throw getError || new Error('Préstamo no encontrado')
  }

  let lugarNombre = prestamo.lugar_id
  if (prestamo.lugar_id === 'personal') {
    lugarNombre = `Préstamo Personal (${prestamo.responsable || 'Sin asignar'})`
  } else {
    const { data: lugarData } = await supabase
      .from('lugares')
      .select('nombre')
      .eq('id', prestamo.lugar_id)
      .maybeSingle()
    if (lugarData?.nombre) {
      lugarNombre = lugarData.nombre
    }
  }

  // Obtener código único del equipo
  let equipoCodigo = prestamo.equipo_id
  const { data: eqData } = await supabase
    .from('equipos')
    .select('codigo_unico')
    .eq('id', prestamo.equipo_id)
    .maybeSingle()
  if (eqData?.codigo_unico) {
    equipoCodigo = eqData.codigo_unico
  }

  // Obtener usuario responsable
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

  // Marcar préstamo como devuelto
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

  // Cambiar el estado del equipo a 'disponible' (ubicación liberada)
  await updateEquipoEstado(prestamo.equipo_id, 'disponible', '')

  // Registrar log de auditoría explícito con el lugar para asegurar que Bitácora y Auditoría lo muestren de inmediato
  try {
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
