import React, { useMemo, useState } from 'react'
import type { Prestamo, Equipo } from '../../types/supabase'
import { marcarDevolucion } from '../../services/prestamos'

interface Props {
  lugarId: string
  prestamos: Prestamo[]
  equiposMap: Map<string, Equipo>
  onClose?: () => void
}

export function RecoverForm({ lugarId, prestamos, equiposMap, onClose }: Props) {
  const activos = useMemo(() => {
    return prestamos
      .filter((p) => p.lugar_id === lugarId && p.estado === 'prestado')
      .map((p) => {
        const equipo = equiposMap.get(p.equipo_id)
        return {
          prestamoId: p.id,
          equipoId: p.equipo_id,
          codigoUnico: equipo?.codigo_unico || p.equipo_id,
          nombreEquipo: equipo?.nombre || '',
        }
      })
      .sort((a, b) => String(a.codigoUnico).localeCompare(String(b.codigoUnico), undefined, { numeric: true }))
  }, [lugarId, prestamos, equiposMap])

  const [seleccion, setSeleccion] = useState<string[]>([])
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')
    if (seleccion.length === 0) {
      setStatus('Selecciona al menos un equipo')
      return
    }

    setLoading(true)
    try {
      for (const prestamoId of seleccion) {
        await marcarDevolucion(prestamoId)
      }
      onClose?.()
    } catch (err) {
      console.error(err)
      setStatus('Error al registrar devolución')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <label className="text-xs font-semibold text-slate-300">Equipos Prestados en este Lugar</label>
        <div className="grid gap-2 min-h-24 max-h-56 overflow-y-auto p-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
          {activos.map((x) => {
            const selected = seleccion.includes(x.prestamoId)
            return (
              <button
                key={x.prestamoId}
                type="button"
                aria-pressed={selected}
                className={`w-full px-3 py-2 rounded-md text-xs transition font-mono tracking-wide flex items-center justify-between cursor-pointer ${
                  selected
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800'
                }`}
                onClick={() =>
                  setSeleccion((prev) =>
                    prev.includes(x.prestamoId) ? prev.filter((id) => id !== x.prestamoId) : [...prev, x.prestamoId]
                  )
                }
              >
                <span className="truncate font-semibold">{x.codigoUnico}</span>
                <span className="text-[10px] opacity-80 truncate ml-2">{x.nombreEquipo}</span>
              </button>
            )
          })}
          {activos.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No hay préstamos activos en este lugar</p>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{seleccion.length} seleccionado(s)</span>
          {seleccion.length > 0 && (
            <button type="button" className="text-cyan-400 hover:underline cursor-pointer" onClick={() => setSeleccion([])}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {status && <div className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-900/50">{status}</div>}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
          type="submit"
          disabled={loading || activos.length === 0}
        >
          {loading ? 'Devolviendo...' : 'Marcar Devuelto'}
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
