import React, { useEffect, useState } from 'react'
import { createPrestamo, preventDuplicateLoan, listenPrestamosActivos, listenTodosPrestamos } from '../../services/prestamos'
import { getEquipoByCodigo, listenEquipos } from '../../services/equipos'
import type { Prestamo } from '../../types/supabase'

interface Props {
  onClose?: () => void
  lugarId: string
}

export function LoanForm({ onClose, lugarId }: Props) {
  const [codigos, setCodigos] = useState<string[]>([])
  const [responsable, setResponsable] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [equiposOpts, setEquiposOpts] = useState<Array<{ id: string; codigoUnico: string; nombre: string }>>([])
  const [equiposPrestados, setEquiposPrestados] = useState<Set<string>>(new Set())
  const [todosPrestamos, setTodosPrestamos] = useState<Prestamo[]>([])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')
    if (!codigos.length) {
      setStatus('Selecciona al menos un equipo')
      return
    }

    setLoading(true)
    try {
      for (const code of codigos) {
        const equipo = await getEquipoByCodigo(code)
        if (!equipo) continue
        const okDisponible = await preventDuplicateLoan(equipo.id)
        if (!okDisponible) continue

        await createPrestamo({
          lugar_id: lugarId,
          equipo_id: equipo.id,
          cantidad: 1,
          responsable: responsable.trim() || 'General',
          fecha_prestamo: new Date().toISOString(),
          estado: 'prestado',
          observaciones: observaciones.trim() || undefined,
        })
      }
      setStatus('Préstamo registrado correctamente')
      onClose?.()
    } catch (err) {
      console.error(err)
      setStatus('Error al registrar préstamo')
    } finally {
      setLoading(false)
    }
  }

  // Escuchar préstamos activos
  useEffect(() => {
    const off = listenPrestamosActivos((prestamos) => {
      const prestadosIds = new Set(prestamos.map((p) => p.equipo_id))
      setEquiposPrestados(prestadosIds)
    })
    return () => off()
  }, [])

  // Escuchar todos los préstamos para frecuencias
  useEffect(() => {
    const off = listenTodosPrestamos(setTodosPrestamos)
    return () => off()
  }, [])

  // Escuchar equipos disponibles
  useEffect(() => {
    const off = listenEquipos((eqs) => {
      const frecuenciaPorEquipo = new Map<string, number>()
      for (const p of todosPrestamos) {
        frecuenciaPorEquipo.set(p.equipo_id, (frecuenciaPorEquipo.get(p.equipo_id) || 0) + 1)
      }

      const disponibles = eqs
        .filter((e) => e.estado === 'disponible' && !equiposPrestados.has(e.id))
        .sort((a, b) => {
          const freqA = frecuenciaPorEquipo.get(a.id) || 0
          const freqB = frecuenciaPorEquipo.get(b.id) || 0
          if (freqB !== freqA) return freqB - freqA
          return String(a.codigo_unico).localeCompare(String(b.codigo_unico), undefined, { numeric: true })
        })
      setEquiposOpts(disponibles.map((e) => ({ id: e.id, codigoUnico: e.codigo_unico, nombre: e.nombre })))
    })
    return () => off()
  }, [equiposPrestados, todosPrestamos])

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-300">Seleccionar Equipos Disponibles</label>
        <div className="grid gap-2 min-h-24 max-h-48 overflow-y-auto p-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
          {equiposOpts.map((e) => {
            const selected = codigos.includes(e.codigoUnico)
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={selected}
                className={`w-full px-3 py-2 rounded-md text-xs transition font-mono tracking-wide flex items-center justify-between cursor-pointer ${
                  selected
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800'
                }`}
                onClick={() =>
                  setCodigos((prev) => (prev.includes(e.codigoUnico) ? prev.filter((x) => x !== e.codigoUnico) : [...prev, e.codigoUnico]))
                }
              >
                <span className="truncate">{e.codigoUnico}</span>
                <span className="text-[10px] opacity-80 truncate ml-2">{e.nombre}</span>
              </button>
            )
          })}
          {equiposOpts.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No hay equipos disponibles</p>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{codigos.length} seleccionado(s)</span>
          {codigos.length > 0 && (
            <button type="button" className="text-cyan-400 hover:underline cursor-pointer" onClick={() => setCodigos([])}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-semibold text-slate-300">Persona Responsable (Opcional)</label>
        <input
          type="text"
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          placeholder="Ej: Dr. Pérez / Cátedra A"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-semibold text-slate-300">Observaciones (Opcional)</label>
        <input
          type="text"
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas adicionales..."
        />
      </div>

      {status && <div className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-900/50">{status}</div>}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Registrando...' : 'Registrar Préstamo'}
        </button>
        <button
          className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-lg text-xs cursor-pointer"
          type="button"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
