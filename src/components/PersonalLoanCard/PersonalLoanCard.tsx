import { useState } from 'react'
import { UserCheck, RotateCcw, Loader2 } from 'lucide-react'
import { marcarDevolucion } from '../../services/prestamos'

export interface PersonalLoanGroup {
  responsable: string
  prestamoIds: string[]
  equiposCodigos: string[]
  fecha: string
  observaciones?: string
}

interface Props {
  loanGroup: PersonalLoanGroup
  onSuccess?: () => void
}

export function PersonalLoanCard({ loanGroup, onSuccess }: Props) {
  const [recovering, setRecovering] = useState(false)

  const handleRecuperar = async () => {
    setRecovering(true)
    try {
      for (const id of loanGroup.prestamoIds) {
        await marcarDevolucion(id)
      }
      await onSuccess?.()
    } catch (err) {
      console.error(err)
      alert('Error al recuperar el préstamo personal')
    } finally {
      setRecovering(false)
    }
  }

  const formattedDate = new Date(loanGroup.fecha).toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="relative card w-full border border-indigo-500/30 bg-slate-900/90 hover:border-indigo-500/60 p-4 rounded-xl shadow-xl transition-all duration-200 shadow-indigo-950/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <UserCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-100 truncate">{loanGroup.responsable}</h3>
            <p className="text-[11px] text-indigo-300 font-medium">Préstamo Personal Directo • {formattedDate}</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded font-semibold border border-indigo-800/80">
          {loanGroup.equiposCodigos.length} equipo(s)
        </span>
      </div>

      {(() => {
        const cleanNotes = loanGroup.observaciones?.replace(/^\[PERSONAL\]\s*/, '').trim()
        if (!cleanNotes || cleanNotes === 'Préstamo a personal') return null
        return (
          <p className="mt-2 text-xs text-slate-400 italic bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
            "{cleanNotes}"
          </p>
        )
      })()}

      {/* Lista de Códigos de Equipos */}
      <ul className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {loanGroup.equiposCodigos.map((code) => (
          <li
            key={code}
            className="px-2 py-0.5 rounded font-mono font-semibold tracking-wide bg-slate-950 text-cyan-300 border border-slate-800"
          >
            {code}
          </li>
        ))}
      </ul>

      {/* Botón Recuperar */}
      <div className="mt-4">
        <button
          onClick={handleRecuperar}
          disabled={recovering}
          className="w-full btn bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-900/30 transition-all"
        >
          {recovering ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5 text-indigo-200" />
          )}
          <span>{recovering ? 'Recuperando...' : 'Recuperar / Devolver Equipos'}</span>
        </button>
      </div>
    </div>
  )
}
