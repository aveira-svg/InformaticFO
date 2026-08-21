import { supabase } from './supabaseClient'
import type { EventoAgenda } from '../types/supabase'

// Obtener reservas de agenda directamente
export async function getEventosAgenda(): Promise<EventoAgenda[]> {
  const { data, error } = await supabase
    .from('eventos_agenda')
    .select('*')
    .eq('is_deleted', false)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error || !data) {
    console.error('Error fetching eventos_agenda:', error)
    return []
  }
  return data
}

// Escuchar reservas de agenda en tiempo real
export function listenEventosAgenda(cb: (eventos: EventoAgenda[]) => void) {
  const fetchAgenda = () => {
    getEventosAgenda().then(cb)
  }

  fetchAgenda()

  const channelId = 'eventos_agenda_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
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

// Agregar reserva simple a la agenda
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

// Agregar múltiples reservas con repetición semanal
export async function addEventosAgendaRecurrentes(
  baseData: Omit<EventoAgenda, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>,
  semanasRepeticion: number
) {
  const records = []
  const [year, month, day] = baseData.fecha.split('-').map(Number)
  const baseDate = new Date(year, month - 1, day)

  for (let i = 0; i < semanasRepeticion; i++) {
    const nextDate = new Date(baseDate)
    nextDate.setDate(baseDate.getDate() + i * 7)
    const yyyy = nextDate.getFullYear()
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0')
    const dd = String(nextDate.getDate()).padStart(2, '0')
    const fechaStr = `${yyyy}-${mm}-${dd}`

    records.push({
      fecha: fechaStr,
      hora_inicio: baseData.hora_inicio,
      hora_fin: baseData.hora_fin,
      lugar_id: baseData.lugar_id,
      titulo: baseData.titulo || null,
      descripcion: baseData.descripcion || null,
      responsable: baseData.responsable || null,
      is_deleted: false,
    })
  }

  const { data, error } = await supabase
    .from('eventos_agenda')
    .insert(records)
    .select()

  if (error) {
    throw error
  }
  return data
}

// Actualizar reserva en la agenda
export async function updateEventoAgenda(
  eventoId: string,
  data: Partial<Omit<EventoAgenda, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>>
) {
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
