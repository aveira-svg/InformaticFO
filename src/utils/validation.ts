import type { Prestamo } from '../types/supabase'

export function validateUniqueCode(code: string): boolean {
  return /^[A-Z]{3,5}-?[A-Z]?\d{3}$/i.test(code.trim())
}

export function validateLoanData(prestamo: Partial<Prestamo>): string[] {
  const errors: string[] = []
  if (!prestamo.lugar_id) errors.push('Lugar es obligatorio')
  if (!prestamo.equipo_id) errors.push('Equipo es obligatorio')
  if (!prestamo.responsable) errors.push('Responsable es obligatorio')
  if (!prestamo.fecha_prestamo) errors.push('Fecha de préstamo es obligatoria')
  return errors
}



