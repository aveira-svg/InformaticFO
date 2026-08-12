import React, { useEffect, useState } from 'react'
import { createPrestamo, preventDuplicateLoan, listenPrestamosActivos } from '../../services/prestamos'
import { getEquipoByCodigo, listenEquipos } from '../../services/equipos'
import { User, Plus } from 'lucide-react'

export const PERSONAL_LOAN_UUID = '00000000-0000-0000-0000-000000000000'

interface Props {
  onClose?: () => void
  onSuccess?: () => void
  fallbackLugarId?: string
}

export function PersonalLoanForm({ onClose, onSuccess, fallbackLugarId }: Props) {
  const [codigos, setCodigos] = useState<string[]>([])
  const [responsable, setResponsable] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [equiposOpts, setEquiposOpts] = useState<Array<{ id: string; codigoUnico: string; nombre: string }>>([])
  const [equiposPrestados, setEquiposPrestados] = useState<Set<string>>(new Set())

  // Escuchar préstamos activos para deshabilitar equipos que ya están prestados
  useEffect(() => {
    const off = listenPrestamosActivos((prestamos) => {
      const prestadosIds = new Set(prestamos.map((p) => p.equipo_id))
      setEquiposPrestados(prestadosIds)
    })
    return () => off()
  }, [])

  // Escuchar equipos disponibles (solo no históricos)
  useEffect(() => {
    const off = listenEquipos((eqs) => {
      const disponibles = eqs
        .filter((e) => e.estado === 'disponible' && !equiposPrestados.has(e.id) && e.historico !== true)
        .sort((a, b) => String(a.codigo_unico).localeCompare(String(b.codigo_unico), undefined, { numeric: true }))
      setEquiposOpts(disponibles.map((e) => ({ id: e.id, codigoUnico: e.codigo_unico, nombre: e.nombre })))
    })
    return () => off()
  }, [equiposPrestados])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')

    if (!codigos.length) {
      setStatus('Selecciona al menos un equipo')
      return
    }

    if (!responsable.trim()) {
      setStatus('Ingresa el nombre del responsable')
      return
    }

    setLoading(true)
    const userNote = observaciones.trim() ? observaciones.trim() : 'Préstamo a personal'
    const finalNote = `[PERSONAL] ${userNote}`

    try {
      for (const code of codigos) {
        const equipo = await getEquipoByCodigo(code)
        if (!equipo) continue
        const okDisponible = await preventDuplicateLoan(equipo.id)
        if (!okDisponible) continue

        try {
          await createPrestamo({
            lugar_id: PERSONAL_LOAN_UUID,
            equipo_id: equipo.id,
            cantidad: 1,
            responsable: responsable.trim(),
            fecha_prestamo: new Date().toISOString(),
            estado: 'prestado',
            observaciones: finalNote,
          })
        } catch (err: any) {
          // Si falla por Foreign Key (23503), usamos el lugar de respaldo existente
          if ((err?.code === '23503' || err?.message?.includes('foreign key')) && fallbackLugarId) {
            await createPrestamo({
              lugar_id: fallbackLugarId,
              equipo_id: equipo.id,
              cantidad: 1,
              responsable: responsable.trim(),
              fecha_prestamo: new Date().toISOString(),
              estado: 'prestado',
              observaciones: finalNote,
            })
          } else {
            throw err
          }
        }
      }
      setStatus('Préstamo registrado correctamente')
      await onSuccess?.()
      onClose?.()
    } catch (err) {
      console.error('Error al registrar préstamo personal:', err)
      setStatus('Error al registrar el préstamo personal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Campo Responsable */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <User className="size-3.5 text-cyan-400" />
          <span>Responsable / Persona a cargo (Texto Libre)</span>
        </label>
        <input
          type="text"
          required
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
          placeholder="Ej: Lic. Juan Pérez / Ing. María Ruiz"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
        />
      </div>

      {/* Seleccionar Equipos */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold text-slate-300">Seleccionar Equipo(s) para Préstamo</label>
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
                  setCodigos((prev) =>
                    prev.includes(e.codigoUnico) ? prev.filter((x) => x !== e.codigoUnico) : [...prev, e.codigoUnico]
                  )
                }
              >
                <span className="truncate font-semibold">{e.codigoUnico}</span>
                <span className="text-[10px] opacity-80 truncate ml-2">{e.nombre}</span>
              </button>
            )
          })}
          {equiposOpts.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No hay equipos disponibles para prestar</p>
          )}
        </div>
        <span className="text-[11px] text-slate-400">{codigos.length} equipo(s) seleccionado(s)</span>
      </div>

      {/* Observaciones (Opcional) */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Observaciones (Opcional)</label>
        <input
          type="text"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
          placeholder="Ej: Para evento externo / Uso temporal"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {status && (
        <div className="text-xs text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-900/50">{status}</div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-lg text-xs cursor-pointer"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !codigos.length || !responsable.trim()}
          className="btn bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          <Plus className="size-4" />
          <span>{loading ? 'Registrando...' : 'Registrar Préstamo'}</span>
        </button>
      </div>
    </form>
  )
}
