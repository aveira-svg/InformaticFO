import { supabase } from './supabaseClient'

export interface DeletedRecord {
  id: string
  tableName: 'lugares' | 'equipos' | 'tipos_equipo' | 'eventos_agenda' | 'tasks' | 'profiles'
  tableLabel: string
  title: string
  subtitle?: string
  deletedAt?: string
}

export async function fetchAllDeletedRecords(): Promise<DeletedRecord[]> {
  const deleted: DeletedRecord[] = []

  try {
    // 1. Lugares
    const { data: lugares } = await supabase.from('lugares').select('*').eq('is_deleted', true)
    lugares?.forEach((l) =>
      deleted.push({
        id: l.id,
        tableName: 'lugares',
        tableLabel: 'Lugar',
        title: l.nombre,
        subtitle: l.descripcion,
        deletedAt: l.updated_at,
      })
    )

    // 2. Equipos
    const { data: equipos } = await supabase.from('equipos').select('*').eq('is_deleted', true)
    equipos?.forEach((e) =>
      deleted.push({
        id: e.id,
        tableName: 'equipos',
        tableLabel: 'Equipo',
        title: `${e.codigo_unico} — ${e.nombre}`,
        subtitle: `Tipo: ${e.tipo} | Estado anterior: ${e.estado}`,
        deletedAt: e.updated_at,
      })
    )

    // 3. Tipos de equipo
    const { data: tipos } = await supabase.from('tipos_equipo').select('*').eq('is_deleted', true)
    tipos?.forEach((t) =>
      deleted.push({
        id: t.id,
        tableName: 'tipos_equipo',
        tableLabel: 'Tipo de Equipo',
        title: t.nombre,
        deletedAt: t.created_at,
      })
    )

    // 4. Agenda
    const { data: agenda } = await supabase.from('eventos_agenda').select('*').eq('is_deleted', true)
    agenda?.forEach((a) =>
      deleted.push({
        id: a.id,
        tableName: 'eventos_agenda',
        tableLabel: 'Reserva Agenda',
        title: a.titulo || 'Sin título',
        subtitle: `Fecha: ${a.fecha} (${a.hora_inicio} - ${a.hora_fin})`,
        deletedAt: a.updated_at,
      })
    )

    // 5. Tareas
    const { data: tasks } = await supabase.from('tasks').select('*').eq('is_deleted', true)
    tasks?.forEach((t) =>
      deleted.push({
        id: t.id,
        tableName: 'tasks',
        tableLabel: 'Tarea',
        title: t.description,
        deletedAt: t.completed_at || t.created_at,
      })
    )

    // 6. Perfiles / Usuarios
    const { data: profiles } = await supabase.from('profiles').select('*').eq('is_deleted', true)
    profiles?.forEach((p) =>
      deleted.push({
        id: p.id,
        tableName: 'profiles',
        tableLabel: 'Usuario',
        title: `${p.short_name} (${p.email})`,
        subtitle: `Rol: ${p.role}`,
        deletedAt: p.updated_at,
      })
    )
  } catch (err) {
    console.error('Error fetching deleted records:', err)
  }

  return deleted
}

export async function restoreRecord(tableName: string, id: string): Promise<void> {
  const updateObj: Record<string, any> = { is_deleted: false, updated_at: new Date().toISOString() }
  if (tableName === 'equipos') {
    updateObj.estado = 'disponible'
  }

  const { error } = await supabase.from(tableName).update(updateObj).eq('id', id)
  if (error) {
    throw error
  }
}
