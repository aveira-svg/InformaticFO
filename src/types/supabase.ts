export interface Profile {
  id: string
  email: string
  short_name: string
  role: 'admin' | 'user'
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export interface Lugar {
  id: string
  nombre: string
  descripcion?: string
  activo: boolean
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export type TipoEquipo = string

export interface TipoEquipoDoc {
  id: string
  nombre: string
  icono?: string
  activo: boolean
  orden: number
  is_deleted: boolean
  created_at?: string
}

export type EstadoEquipo = 'disponible' | 'en_uso' | 'mantenimiento' | 'de_baja'

export interface Equipo {
  id: string
  codigo_unico: string
  nombre: string
  tipo: TipoEquipo
  marca?: string
  modelo?: string
  numero_serie?: string
  estado: EstadoEquipo
  estado_otro?: string
  ubicacion_actual?: string
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export type EstadoPrestamo = 'prestado' | 'devuelto' | 'vencido'

export interface Prestamo {
  id: string
  lugar_id: string
  equipo_id: string
  cantidad: number
  responsable: string
  fecha_prestamo: string
  fecha_devolucion?: string
  estado: EstadoPrestamo
  observaciones?: string
  is_deleted: boolean
}

export interface EventoAgenda {
  id: string
  fecha: string // formato YYYY-MM-DD
  hora_inicio: string // formato HH:mm:ss o HH:mm
  hora_fin: string // formato HH:mm:ss o HH:mm
  lugar_id: string
  titulo?: string
  descripcion?: string
  responsable?: string
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export interface Task {
  id: string
  description: string
  status: 'pendiente' | 'completada'
  created_by: string
  created_at: string
  completed_at?: string
  completion_message?: string
  is_deleted: boolean
}

export interface TaskAssignment {
  task_id: string
  user_id: string
}

export interface TaskUpdate {
  id: string
  task_id: string
  update_text: string
  created_by: string
  created_at: string
}

export interface AuditLog {
  id: string
  timestamp: string
  user_id?: string
  user_short_name: string
  action_type: string
  details: string
  module: string
}

export interface EquipmentHistory {
  id: string
  equipo_id: string
  timestamp: string
  user_id?: string
  action_type: 'creacion' | 'edicion' | 'baja' | 'prestamo' | 'devolucion'
  previous_state?: string
  new_state?: string
  previous_location?: string
  new_location?: string
  details?: string
}
