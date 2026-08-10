import { useEffect, useState } from 'react'
import { listenEventos, type EventoItem } from '../../services/eventos'
import { Activity, X } from 'lucide-react'

export function EventLog() {
  const [eventos, setEventos] = useState<EventoItem[]>([])
  const [detail, setDetail] = useState<EventoItem | null>(null)

  useEffect(() => {
    const off = listenEventos(setEventos, 50)
    return () => off()
  }, [])

  return (
    <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-xl">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
        <Activity className="size-4 text-cyan-400 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-200">Bitácora de Eventos y Actividad Reciente</h3>
      </div>

      <ul className="text-xs space-y-2 min-h-24 max-h-[35dvh] overflow-y-auto pr-1">
        {eventos.map((e) => {
          const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <li key={e.id} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-800/60 transition-colors">
              <button
                className="flex items-center gap-2 text-left truncate text-slate-300 hover:text-cyan-300 cursor-pointer w-full"
                onClick={() => setDetail(e)}
              >
                <span className="font-mono text-cyan-400/80 text-[11px]">[{time}]</span>
                <span>{e.icono}</span>
                <span className="truncate font-medium">{e.descripcion}</span>
                {e.userShortName && (
                  <span className="ml-auto text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    {e.userShortName}
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {eventos.length === 0 && (
          <li className="text-xs text-slate-500 text-center py-4">No hay actividad reciente registrada</li>
        )}
      </ul>

      {/* Modal Detalle */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm card bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-2xl text-slate-200 animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h4 className="font-semibold text-cyan-400 text-sm">Detalle de Evento</h4>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setDetail(null)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Tipo de Acción:</span>
                <p className="font-medium text-slate-100 mt-0.5">{detail.tipo}</p>
              </div>
              <div>
                <span className="text-slate-400">Descripción:</span>
                <p className="font-medium text-slate-100 mt-0.5 break-words bg-slate-950 p-2 rounded border border-slate-800">
                  {detail.descripcion}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Fecha y Hora:</span>
                <p className="text-slate-200 mt-0.5">{new Date(detail.timestamp).toLocaleString()}</p>
              </div>
              {detail.userShortName && (
                <div>
                  <span className="text-slate-400">Usuario Responsable:</span>
                  <p className="text-cyan-300 font-medium mt-0.5">{detail.userShortName}</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="btn-secondary px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-lg cursor-pointer"
                onClick={() => setDetail(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
