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
  activo: boolean       // Visibilidad en Dashboard (controlado desde Configuración)
  disponible: boolean   // Estado operativo ON/OFF (controlado desde la tarjeta del Dashboard)
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
  personal_a_cargo?: string
  is_deleted: boolean
  historico?: boolean
  created_at?: string
  updated_at?: string
}

export type EstadoResguardo = 'asignado' | 'en_reparacion' | 'de_baja' | 'disponible'

export interface Resguardo {
  id: string
  codigo_unico: string
  nombre: string
  tipo: TipoEquipo
  marca?: string
  modelo?: string
  numero_serie?: string
  area_o_destino?: string
  personal_a_cargo?: string
  estado: EstadoResguardo
  observaciones?: string
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export interface ResguardoHistory {
  id: string
  resguardo_id: string
  timestamp: string
  user_id?: string
  action_type: 'creacion' | 'edicion' | 'baja' | 'asignacion' | 'reparacion'
  previous_state?: string
  new_state?: string
  previous_location?: string
  new_location?: string
  details?: string
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
  title?: string
  subtitle?: string
  description: string
  lugar_id?: string
  lugar?: { id: string; nombre: string }
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

// -----------------------------------------------
// MÓDULO: INVENTARIO DE FALTANTES
// -----------------------------------------------

export type CategoriaFaltante = 'Laboratorio' | 'Papelería' | 'Computación' | 'Limpieza' | 'Otros'
export type PrioridadFaltante = 'Alta' | 'Media' | 'Baja'
export type MonedaFaltante = 'ARS' | 'USD' | 'EUR'

export interface ArticuloBorrador {
  id: string
  nombre: string
  categoria: CategoriaFaltante
  cantidad: number
  prioridad: PrioridadFaltante
  justificacion?: string
  precio_estimado?: number | null
  moneda?: MonedaFaltante
  proveedor?: string
  created_by?: string
  created_at?: string
  is_deleted: boolean
}

export interface PedidoEnviado {
  id: string
  numero_pedido: number
  fecha_envio: string
  solicitante: string
  area?: string
  total_articulos: number
  monto_estimado?: number | null
  moneda?: MonedaFaltante
  created_by?: string
}

export interface PedidoDetalle {
  id: string
  pedido_id: string
  nombre: string
  categoria: CategoriaFaltante
  cantidad: number
  prioridad: PrioridadFaltante
  justificacion?: string
  precio_estimado?: number | null
  moneda?: MonedaFaltante
  proveedor?: string
  orden?: number
}
