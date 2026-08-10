import { supabase } from './supabaseClient'

// Escuchar tareas pendientes en tiempo real (más antiguas primero)
export function listenPendingTasks(cb: (tasks: any[]) => void) {
  const fetchTasks = () => {
    supabase
      .from('tasks')
      .select(`
        *,
        assignments:task_assignments(user_id),
        creator:profiles!tasks_created_by_fkey(short_name)
      `)
      .eq('status', 'pendiente')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching pending tasks:', error)
        }
      })
  }

  fetchTasks()

  const channel = supabase
    .channel('public:tasks_pending')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => fetchTasks())
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Escuchar tareas completadas en tiempo real (más nuevas primero)
export function listenCompletedTasks(cb: (tasks: any[]) => void) {
  const fetchCompleted = () => {
    supabase
      .from('tasks')
      .select(`
        *,
        assignments:task_assignments(user_id),
        creator:profiles!tasks_created_by_fkey(short_name)
      `)
      .eq('status', 'completada')
      .eq('is_deleted', false)
      .order('completed_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching completed tasks:', error)
        }
      })
  }

  fetchCompleted()

  const channel = supabase
    .channel('public:tasks_completed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchCompleted())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => fetchCompleted())
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Crear una tarea
export async function createTask(description: string, assignedUserIds: string[], createdById: string) {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert([
      {
        description: description.trim(),
        status: 'pendiente',
        created_by: createdById,
        is_deleted: false,
      },
    ])
    .select('id')
    .single()

  if (taskError || !task) {
    throw taskError || new Error('No se pudo crear la tarea')
  }

  if (assignedUserIds.length > 0) {
    const assignments = assignedUserIds.map((userId) => ({
      task_id: task.id,
      user_id: userId,
    }))
    const { error: assignError } = await supabase
      .from('task_assignments')
      .insert(assignments)

    if (assignError) {
      throw assignError
    }
  }

  return task.id
}

// Agregar avance/comentario a una tarea
export async function addTaskUpdate(taskId: string, updateText: string, createdById: string) {
  const { error } = await supabase
    .from('task_updates')
    .insert([
      {
        task_id: taskId,
        update_text: updateText.trim(),
        created_by: createdById,
      },
    ])

  if (error) {
    throw error
  }
}

// Escuchar actualizaciones de una tarea
export function listenTaskUpdates(taskId: string, cb: (updates: any[]) => void) {
  const fetchUpdates = () => {
    supabase
      .from('task_updates')
      .select(`
        *,
        creator:profiles(short_name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        }
      })
  }

  fetchUpdates()

  const channel = supabase
    .channel(`public:task_updates:${taskId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_updates', filter: `task_id=eq.${taskId}` }, () => fetchUpdates())
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Marcar tarea como completada
export async function completeTask(taskId: string, message: string, _completedById: string) {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completada',
      completed_at: new Date().toISOString(),
      completion_message: message.trim() || null,
    })
    .eq('id', taskId)

  if (error) {
    throw error
  }
}

// Borrado lógico de tarea
export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ is_deleted: true })
    .eq('id', taskId)

  if (error) {
    throw error
  }
}
