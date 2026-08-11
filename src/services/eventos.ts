import { supabase } from './supabaseClient'

export interface EventoItem {
  id: string
  tipo: string
  descripcion: string
  prioridad: 'baja' | 'media' | 'alta'
  timestamp: string
  icono: string
  lugarId?: string
  equipoId?: string
  userShortName?: string
}

export function listenEventos(cb: (eventos: EventoItem[]) => void, limitCount = 50): () => void {
  const fetchLogs = () => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limitCount)
      .then(({ data, error }) => {
        if (!error && data) {
          const items: EventoItem[] = data.map((log) => {
            let icono = '📌'
            if (log.module === 'prestamos') icono = '🔄'
            if (log.module === 'equipos') icono = '💻'
            if (log.module === 'lugares') icono = '📍'
            if (log.module === 'tasks') icono = '📋'
            if (log.module === 'eventos_agenda') icono = '📅'

            return {
              id: log.id,
              tipo: log.action_type || 'ACCION',
              descripcion: log.details || `${log.action_type} en ${log.module}`,
              prioridad: log.action_type?.includes('DELETE') ? 'alta' : 'media',
              timestamp: log.timestamp,
              icono: icono,
              userShortName: log.user_short_name,
            }
          })
          cb(items)
        }
      })
  }

  fetchLogs()

  const channelId = 'audit_logs_eventos_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      () => {
        fetchLogs()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
