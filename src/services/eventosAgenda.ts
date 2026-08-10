import { supabase } from './supabaseClient'
import type { EventoAgenda } from '../types/supabase'

// Escuchar reservas de agenda en tiempo real
export function listenEventosAgenda(cb: (eventos: EventoAgenda[]) => void) {
  const fetchAgenda = () => {
    supabase
      .from('eventos_agenda')
      .select('*')
      .eq('is_deleted', false)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching eventos_agenda:', error)
        }
      })
  }

  fetchAgenda()

  const channel = supabase
    .channel('public:eventos_agenda')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'eventos_agenda' },
      () => {
        fetchAgenda()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Agregar reserva a la agenda
export async function addEventoAgenda(data: Omit<EventoAgenda, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>) {
  const { data: inserted, error } = await supabase
    .from('eventos_agenda')
    .insert([
      {
        fecha: data.fecha,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        lugar_id: data.lugar_id,
        titulo: data.titulo || null,
        descripcion: data.descripcion || null,
        responsable: data.responsable || null,
        is_deleted: false,
      },
    ])
    .select('id')
    .single()

  if (error) {
    throw error
  }
  return inserted.id
}

// Actualizar reserva en la agenda
export async function updateEventoAgenda(eventoId: string, data: Partial<Omit<EventoAgenda, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>>) {
  const { error } = await supabase
    .from('eventos_agenda')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', eventoId)

  if (error) {
    throw error
  }
}

// Eliminar reserva (Baja Lógica)
export async function deleteEventoAgenda(eventoId: string) {
  const { error } = await supabase
    .from('eventos_agenda')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', eventoId)

  if (error) {
    throw error
  }
}
