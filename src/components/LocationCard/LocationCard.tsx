import { Circle, TriangleAlert, Plus, RotateCcw, Calendar } from 'lucide-react'
import type { EventoAgenda } from '../../types/supabase'

interface Props {
  nombre: string
  activo: boolean
  resumen: { prestados: number; vencidos: number }
  prestados?: string[]
  tienePrestados?: boolean
  eventoAgenda?: { evento: EventoAgenda; estado: 'proximo' | 'en_curso' | 'vencido' } | null
  onPrestar?: () => void
  onDevolver?: () => void
  onHistorial?: () => void
  onToggleActivo?: () => void
}

export function LocationCard({
  nombre,
  activo,
  resumen,
  prestados = [],
  tienePrestados = false,
  eventoAgenda,
  onPrestar,
  onDevolver,
  onToggleActivo,
}: Props) {
  const tieneEventoAlerta = eventoAgenda && (eventoAgenda.estado === 'proximo' || eventoAgenda.estado === 'vencido')
  const tieneAlertaRecuperar = !activo && tienePrestados

  const bgClass = tieneAlertaRecuperar
    ? 'bg-red-950/40 border-red-800 shadow-red-900/20'
    : tieneEventoAlerta
    ? 'bg-amber-950/40 border-amber-800 shadow-amber-900/20'
    : activo
    ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 shadow-slate-950/50'
    : 'bg-slate-950/60 border-slate-900 opacity-85'

  return (
    <div className={`relative card w-full border p-4 rounded-xl shadow-xl transition-all duration-200 ${bgClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Circle
            className={`size-3 ${
              tieneAlertaRecuperar
                ? 'text-red-500 animate-pulse'
                : tieneEventoAlerta
                ? 'text-amber-400 animate-pulse'
                : activo
                ? 'text-cyan-400 shadow-sm shadow-cyan-400'
                : 'text-slate-600'
            }`}
            fill="currentColor"
          />
          <h3
            className={`text-base sm:text-lg font-semibold truncate ${
              tieneAlertaRecuperar ? 'text-red-200' : tieneEventoAlerta ? 'text-amber-200' : 'text-slate-100'
            }`}
          >
            {nombre}
          </h3>
        </div>
        {resumen.vencidos > 0 && (
          <div className="flex items-center gap-1 text-red-400 text-xs font-semibold bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
            <TriangleAlert className="size-3.5" />
            {resumen.vencidos} vencido(s)
          </div>
        )}
      </div>

      <div
        className={`mt-2 text-xs sm:text-sm ${
          tieneAlertaRecuperar ? 'text-red-300' : tieneEventoAlerta ? 'text-amber-300' : 'text-slate-400'
        }`}
      >
        {tieneAlertaRecuperar ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TriangleAlert className="size-3.5 text-red-400" />
            <span className="font-semibold text-red-200">
              {resumen.prestados} equipo(s) prestados — inactivo
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-red-900/80 text-red-200 rounded font-bold animate-pulse border border-red-700">
              ⚠️ ¡Recuperar equipos!
            </span>
          </div>
        ) : eventoAgenda ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className={`size-3.5 ${tieneEventoAlerta ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className={tieneEventoAlerta ? 'font-semibold text-amber-200' : 'text-slate-300'}>
              {eventoAgenda.evento.titulo || 'Evento'} ({eventoAgenda.evento.hora_inicio} - {eventoAgenda.evento.hora_fin})
            </span>
            {eventoAgenda.estado === 'proximo' && (
              <span className="text-[10px] px-2 py-0.5 bg-amber-900/80 text-amber-200 rounded font-bold animate-pulse border border-amber-700">
                ⏰ Próximo
              </span>
            )}
            {eventoAgenda.estado === 'vencido' && (
              <span className="text-[10px] px-2 py-0.5 bg-amber-900/80 text-amber-200 rounded font-bold animate-pulse border border-amber-700">
                ⚠️ ¡Apagar!
              </span>
            )}
          </div>
        ) : (
          <span>
            {resumen.prestados} equipo(s) prestados — <strong className={activo ? 'text-cyan-400' : 'text-slate-500'}>{activo ? 'activo' : 'inactivo'}</strong>
          </span>
        )}
      </div>

      {prestados.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
          {prestados.map((code) => (
            <li
              key={code}
              className={`px-2 py-0.5 rounded font-mono tracking-wide ${
                tieneAlertaRecuperar
                  ? 'bg-red-900/40 text-red-200 border border-red-800'
                  : tieneEventoAlerta
                  ? 'bg-amber-900/40 text-amber-200 border border-amber-800'
                  : 'bg-slate-950 text-cyan-300 border border-slate-800'
              }`}
            >
              {code}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          className={`btn text-xs font-semibold py-1.5 rounded-lg cursor-pointer transition-all ${
            activo
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
          onClick={onToggleActivo}
        >
          {activo ? 'ON' : 'OFF'}
        </button>
        <button
          className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs py-1.5 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-cyan-500/10"
          onClick={onPrestar}
        >
          <Plus className="size-3.5" />
          <span>Prestar</span>
        </button>
        <button
          className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-1.5 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
          onClick={onDevolver}
        >
          <RotateCcw className="size-3.5 text-cyan-400" />
          <span>Recuperar</span>
        </button>
      </div>
    </div>
  )
}
