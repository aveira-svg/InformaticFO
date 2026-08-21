import { supabase } from './supabaseClient'
import type {
  ArticuloBorrador,
  PedidoEnviado,
  PedidoDetalle,
  CategoriaFaltante,
  PrioridadFaltante,
  MonedaFaltante,
} from '../types/supabase'

// -----------------------------------------------
// ARTÍCULOS BORRADOR
// -----------------------------------------------

/** Obtener artículos del borrador activo directamente */
export async function getArticulosBorrador(): Promise<ArticuloBorrador[]> {
  const { data, error } = await supabase
    .from('articulos_borrador')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (error || !data) {
    if (error) console.error('Error fetching articulos_borrador:', error)
    return []
  }
  return data as ArticuloBorrador[]
}

/** Escuchar artículos del borrador activo en tiempo real con refresco preventivo */
export function listenArticulosBorrador(cb: (articulos: ArticuloBorrador[]) => void): () => void {
  const fetch = () => {
    getArticulosBorrador().then(cb)
  }

  fetch()

  const channelId = 'articulos_borrador_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'articulos_borrador' }, fetch)
    .subscribe()

  // Refresco periódico cada 10 segundos
  const timer = setInterval(fetch, 10000)

  return () => {
    clearInterval(timer)
    supabase.removeChannel(channel)
  }
}

/** Crear un nuevo artículo en el borrador */
export async function createArticuloBorrador(
  userId: string,
  data: {
    nombre: string
    categoria: CategoriaFaltante
    cantidad: number
    prioridad: PrioridadFaltante
    justificacion?: string
    precio_estimado?: number | null
    moneda?: MonedaFaltante
    proveedor?: string
  }
): Promise<ArticuloBorrador> {
  const payload = {
    nombre: data.nombre.trim(),
    categoria: data.categoria,
    cantidad: data.cantidad,
    prioridad: data.prioridad,
    justificacion: data.justificacion?.trim() || null,
    precio_estimado: data.precio_estimado ?? null,
    moneda: data.moneda || 'ARS',
    proveedor: data.proveedor?.trim() || null,
    created_by: userId,
    is_deleted: false,
  }

  const { data: created, error } = await supabase
    .from('articulos_borrador')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return created as ArticuloBorrador
}

/** Actualizar un artículo del borrador */
export async function updateArticuloBorrador(
  id: string,
  data: Partial<Omit<ArticuloBorrador, 'id' | 'created_by' | 'created_at' | 'is_deleted'>>
): Promise<void> {
  const { error } = await supabase
    .from('articulos_borrador')
    .update({ ...data })
    .eq('id', id)

  if (error) throw error
}

/** Eliminar (baja lógica) un artículo del borrador */
export async function deleteArticuloBorrador(id: string): Promise<void> {
  const { error } = await supabase
    .from('articulos_borrador')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) throw error
}

// -----------------------------------------------
// ACCIÓN ATÓMICA: ENVIAR PEDIDO
// -----------------------------------------------

export async function enviarPedido(
  userId: string,
  solicitante: string,
  area: string,
  articulos: ArticuloBorrador[]
): Promise<PedidoEnviado> {
  if (articulos.length === 0) throw new Error('No hay artículos en el borrador')

  const totalArticulos = articulos.reduce((sum, a) => sum + a.cantidad, 0)
  const monedaPrincipal = articulos[0]?.moneda || 'ARS'
  const montoEstimado = articulos.reduce((sum, a) => {
    if (a.precio_estimado != null) return sum + a.precio_estimado * a.cantidad
    return sum
  }, 0)

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos_enviados')
    .insert([
      {
        solicitante: solicitante.trim(),
        area: area.trim() || null,
        total_articulos: totalArticulos,
        monto_estimado: montoEstimado > 0 ? montoEstimado : null,
        moneda: monedaPrincipal,
        created_by: userId,
      },
    ])
    .select()
    .single()

  if (pedidoError) throw pedidoError

  const detalles = articulos.map((a, idx) => ({
    pedido_id: pedido.id,
    nombre: a.nombre,
    categoria: a.categoria,
    cantidad: a.cantidad,
    prioridad: a.prioridad,
    justificacion: a.justificacion || null,
    precio_estimado: a.precio_estimado ?? null,
    moneda: a.moneda || 'ARS',
    proveedor: a.proveedor || null,
    orden: idx,
  }))

  const { error: detallesError } = await supabase.from('pedido_detalles').insert(detalles)
  if (detallesError) throw detallesError

  const ids = articulos.map((a) => a.id)
  const { error: deleteError } = await supabase
    .from('articulos_borrador')
    .update({ is_deleted: true })
    .in('id', ids)

  if (deleteError) throw deleteError

  return pedido as PedidoEnviado
}

// -----------------------------------------------
// PEDIDOS ENVIADOS (HISTORIAL)
// -----------------------------------------------

/** Obtener historial de pedidos enviados directamente */
export async function getPedidosEnviados(): Promise<PedidoEnviado[]> {
  const { data, error } = await supabase
    .from('pedidos_enviados')
    .select('*')
    .order('fecha_envio', { ascending: false })

  if (error || !data) {
    if (error) console.error('Error fetching pedidos_enviados:', error)
    return []
  }
  return data as PedidoEnviado[]
}

/** Escuchar pedidos enviados en tiempo real con refresco preventivo */
export function listenPedidosEnviados(cb: (pedidos: PedidoEnviado[]) => void): () => void {
  const fetch = () => {
    getPedidosEnviados().then(cb)
  }

  fetch()

  const channelId = 'pedidos_enviados_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_enviados' }, fetch)
    .subscribe()

  // Refresco periódico cada 10 segundos
  const timer = setInterval(fetch, 10000)

  return () => {
    clearInterval(timer)
    supabase.removeChannel(channel)
  }
}

export async function getPedidoDetalles(pedidoId: string): Promise<PedidoDetalle[]> {
  const { data, error } = await supabase
    .from('pedido_detalles')
    .select('*')
    .eq('pedido_id', pedidoId)
    .order('orden', { ascending: true })

  if (error) {
    console.error('Error fetching pedido_detalles:', error)
    return []
  }
  return (data || []) as PedidoDetalle[]
}
