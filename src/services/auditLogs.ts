import { supabase } from './supabaseClient'
import type { AuditLog } from '../types/supabase'

// Consultar logs filtrados (para página de auditoría de Admin)
export async function queryAuditLogs(filters: {
  search?: string
  dateFrom?: string
  dateTo?: string
  module?: string
}): Promise<AuditLog[]> {
  let query = supabase.from('audit_logs').select('*')

  if (filters.module) {
    query = query.eq('module', filters.module)
  }
  if (filters.dateFrom) {
    query = query.gte('timestamp', new Date(filters.dateFrom).toISOString())
  }
  if (filters.dateTo) {
    const end = new Date(filters.dateTo)
    end.setHours(23, 59, 59, 999)
    query = query.lte('timestamp', end.toISOString())
  }
  if (filters.search?.trim()) {
    const val = `%${filters.search.trim()}%`
    query = query.or(`user_short_name.ilike.${val},action_type.ilike.${val},details.ilike.${val}`)
  }

  const { data, error } = await query
    .order('timestamp', { ascending: false })
    .limit(200) // Límite razonable para rendimiento

  if (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
  return data || []
}

// Escuchar los logs de auditoría recientes para el dashboard (en tiempo real)
export function listenRecentLogs(cb: (logs: AuditLog[]) => void, limitCount = 50) {
  const fetchRecent = () => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limitCount)
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        }
      })
  }

  fetchRecent()

  const channel = supabase
    .channel('public:audit_logs_recent')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      () => {
        fetchRecent()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
