import { supabase } from './supabaseClient'
import type { Prestamo } from '../types/supabase'
import { updateEquipoEstado } from './equipos'

// Escuchar préstamos activos en tiempo real (estado = 'prestado')
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

  const channel = supabase
    .channel('public:prestamos_activos')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'prestamos' },
      () => {
        fetchActivos()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Escuchar todos los préstamos en tiempo real (para estadísticas e historial)
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

  const channel = supabase
    .channel('public:prestamos_todos')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'prestamos' },
      () => {
        fetchTodos()
      }
    )
    .subscribe()

  return () => {
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

  // Cambiar el estado del equipo a 'en_uso'
  await updateEquipoEstado(data.equipo_id, 'en_uso')
}

// Marcar devolución de un préstamo
export async function marcarDevolucion(prestamoId: string) {
  // Obtener detalles del préstamo para saber qué equipo devolver
  const { data: prestamo, error: getError } = await supabase
    .from('prestamos')
    .select('equipo_id')
    .eq('id', prestamoId)
    .single()

  if (getError || !prestamo) {
    throw getError || new Error('Préstamo no encontrado')
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

  // Cambiar el estado del equipo a 'disponible'
  await updateEquipoEstado(prestamo.equipo_id, 'disponible')
}
