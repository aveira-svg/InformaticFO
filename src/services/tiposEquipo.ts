import { supabase } from './supabaseClient'
import type { TipoEquipoDoc } from '../types/supabase'

// Escuchar tipos de equipo en tiempo real
export function listenTiposEquipo(cb: (tipos: TipoEquipoDoc[]) => void): () => void {
  const fetchTipos = () => {
    supabase
      .from('tipos_equipo')
      .select('*')
      .eq('is_deleted', false)
      .order('orden', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching tipos_equipo:', error)
        }
      })
  }

  fetchTipos()

  const channel = supabase
    .channel('public:tipos_equipo')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tipos_equipo' },
      () => {
        fetchTipos()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Crear tipo de equipo
export async function createTipoEquipo(id: string, nombre: string, icono?: string): Promise<void> {
  const { error } = await supabase
    .from('tipos_equipo')
    .insert([
      {
        id: id.trim().toLowerCase().replace(/\s+/g, '_'),
        nombre: nombre.trim(),
        icono: icono || '',
        activo: true,
        orden: Date.now(),
        is_deleted: false,
      },
    ])
  if (error) {
    throw error
  }
}

// Editar tipo de equipo
export async function updateTipoEquipo(id: string, data: Partial<Omit<TipoEquipoDoc, 'id' | 'created_at'>>): Promise<void> {
  const { error } = await supabase
    .from('tipos_equipo')
    .update(data)
    .eq('id', id)
  if (error) {
    throw error
  }
}

// Eliminar tipo de equipo (Baja Lógica)
export async function deleteTipoEquipo(id: string): Promise<void> {
  const { error } = await supabase
    .from('tipos_equipo')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) {
    throw error
  }
}

// Inicializar tipos por defecto si la base de datos está vacía
export async function initDefaultTipos(): Promise<void> {
  const { count, error: countError } = await supabase
    .from('tipos_equipo')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  if (countError || count !== 0) return

  const defaults = [
    { id: 'proyector', nombre: 'Proyector', icono: '📺' },
    { id: 'camara_web', nombre: 'Cámara Web', icono: '📷' },
    { id: 'presentador', nombre: 'Presentador', icono: '🖱️' },
    { id: 'teclado_mouse', nombre: 'Teclado/Mouse', icono: '⌨️' },
    { id: 'parlantes', nombre: 'Parlantes', icono: '🔊' },
    { id: 'pc', nombre: 'PC', icono: '💻' },
  ]
  
  for (const tipo of defaults) {
    try {
      await supabase
        .from('tipos_equipo')
        .insert([{
          id: tipo.id,
          nombre: tipo.nombre,
          icono: tipo.icono,
          activo: true,
          orden: Date.now(),
          is_deleted: false
        }])
    } catch (err) {
      console.warn('initDefaultTipos ya existe o falló:', err)
    }
  }
}
