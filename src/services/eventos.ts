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
          // Filtrar logs genéricos del trigger si existe el registro explícito detallado
          const filteredData = data.filter((log, _idx, arr) => {
            const isGenericPrestamo =
              log.details?.startsWith('Préstamo registrado para equipo ID') ||
              log.details?.includes('marcado como devuelto') ||
              log.details?.startsWith('Préstamo ID ')
            if (!isGenericPrestamo) return true

            const logTime = new Date(log.timestamp).getTime()
            const hasRichDuplicate = arr.some(
              (other) =>
                other.id !== log.id &&
                Math.abs(new Date(other.timestamp).getTime() - logTime) < 4000 &&
                (other.details?.includes('pasó a "en_uso"') || other.details?.includes('pasó a "disponible"'))
            )
            return !hasRichDuplicate
          })

          const items: EventoItem[] = filteredData.map((log) => {
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
