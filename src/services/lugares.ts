import { supabase } from './supabaseClient'
import type { Lugar } from '../types/supabase'

// Obtener lugares directamente
export async function getLugares(): Promise<Lugar[]> {
  const { data, error } = await supabase
    .from('lugares')
    .select('*')
    .eq('is_deleted', false)
    .order('nombre')
  if (error || !data) return []
  return data
}

// Escuchar lugares en tiempo real
export function listenLugares(cb: (lugares: Lugar[]) => void) {
  const fetchLugares = () => {
    supabase
      .from('lugares')
      .select('*')
      .eq('is_deleted', false)
      .order('nombre')
      .then(({ data, error }) => {
        if (!error && data) {
          cb(data)
        } else if (error) {
          console.error('Error fetching lugares:', error)
        }
      })
  }

  fetchLugares()

  const channelId = 'lugares_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lugares' },
      () => {
        fetchLugares()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Agregar nuevo lugar
export async function addLugar(nombre: string, descripcion?: string) {
  const { error } = await supabase
    .from('lugares')
    .insert([
      {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        activo: true,
        disponible: true,
        is_deleted: false,
      },
    ])
  if (error) {
    throw error
  }
}

// Alternar estado activo/inactivo (visibilidad en Dashboard desde Configuración)
export async function setEstadoLugar(lugarId: string, activo: boolean) {
  const { error } = await supabase
    .from('lugares')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', lugarId)
  if (error) {
    throw error
  }
}

// Alternar disponibilidad operativa ON/OFF (persistida en Supabase)
export async function setDisponibleLugar(lugarId: string, disponible: boolean) {
  const { error } = await supabase
    .from('lugares')
    .update({ disponible, updated_at: new Date().toISOString() })
    .eq('id', lugarId)
  if (error) {
    throw error
  }
}

// Actualizar campos del lugar
export async function updateLugar(lugarId: string, data: Partial<Omit<Lugar, 'id' | 'created_at' | 'updated_at'>>) {
  const { error } = await supabase
    .from('lugares')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', lugarId)
  if (error) {
    throw error
  }
}
