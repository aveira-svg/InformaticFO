import { supabase } from './supabaseClient'

export const DEFAULT_CATEGORIAS = ['Laboratorio', 'Papelería', 'Computación', 'Limpieza', 'Otros']
const STORAGE_KEY = 'categorias_faltantes_custom'

// Obtener categorías personalizadas de localStorage
function getLocalCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('Error reading custom categories from storage:', e)
  }
  return []
}

// Guardar categorías personalizadas en localStorage
function saveLocalCustomCategories(cats: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('categorias_faltantes_updated'))
    }
  } catch (e) {
    console.error('Error saving custom categories to storage:', e)
  }
}

// Obtener todas las categorías (predeterminadas + personalizadas de BD y local)
export async function getCategoriasFaltantes(): Promise<string[]> {
  const localCustom = getLocalCustomCategories()
  let dbCustom: string[] = []

  try {
    const { data, error } = await supabase
      .from('categorias_faltantes')
      .select('nombre')
      .eq('is_deleted', false)
      .order('nombre')

    if (!error && data) {
      dbCustom = data.map((d: { nombre: string }) => d.nombre)
      const merged = Array.from(new Set([...localCustom, ...dbCustom]))
      saveLocalCustomCategories(merged)
    }
  } catch {
    // Si la tabla no existe aún en la base de datos remota, continuar con local
  }

  const all = Array.from(new Set([...DEFAULT_CATEGORIAS, ...localCustom, ...dbCustom]))
  return all
}

// Escuchar cambios en categorías en tiempo real
export function listenCategoriasFaltantes(cb: (categorias: string[]) => void): () => void {
  const fetchAll = () => {
    getCategoriasFaltantes().then(cb)
  }

  fetchAll()

  const channelId = 'categorias_faltantes_' + Math.random().toString(36).substring(2, 9)
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias_faltantes' }, () => fetchAll())
    .subscribe()

  const onLocalUpdate = () => fetchAll()
  if (typeof window !== 'undefined') {
    window.addEventListener('categorias_faltantes_updated', onLocalUpdate)
    window.addEventListener('storage', onLocalUpdate)
    window.addEventListener('focus', onLocalUpdate)
  }

  const timer = setInterval(fetchAll, 5000)

  return () => {
    clearInterval(timer)
    if (typeof window !== 'undefined') {
      window.removeEventListener('categorias_faltantes_updated', onLocalUpdate)
      window.removeEventListener('storage', onLocalUpdate)
      window.removeEventListener('focus', onLocalUpdate)
    }
    supabase.removeChannel(channel)
  }
}

// Crear nueva categoría de faltantes
export async function createCategoriaFaltante(nombre: string): Promise<string> {
  const trimmed = nombre.trim()
  if (!trimmed) throw new Error('El nombre de la categoría no puede estar vacío')

  const currentLocal = getLocalCustomCategories()
  if (!currentLocal.includes(trimmed) && !DEFAULT_CATEGORIAS.includes(trimmed)) {
    saveLocalCustomCategories([...currentLocal, trimmed])
  }

  try {
    await supabase.from('categorias_faltantes').insert([
      {
        nombre: trimmed,
        is_deleted: false,
      },
    ])
  } catch (err) {
    console.warn('No se pudo guardar la categoría en Supabase (usando local storage):', err)
  }

  return trimmed
}

// Eliminar categoría personalizada
export async function deleteCategoriaFaltante(nombre: string): Promise<void> {
  const currentLocal = getLocalCustomCategories()
  saveLocalCustomCategories(currentLocal.filter((c) => c.toLowerCase() !== nombre.toLowerCase()))

  try {
    await supabase
      .from('categorias_faltantes')
      .update({ is_deleted: true })
      .eq('nombre', nombre)
  } catch (err) {
    console.warn('No se pudo eliminar la categoría en Supabase (eliminada de local storage):', err)
  }
}
