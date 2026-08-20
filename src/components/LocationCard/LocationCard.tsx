import { Circle, TriangleAlert, Plus, RotateCcw, Calendar, Loader2, Clock, User } from 'lucide-react'
import type { EventoAgenda } from '../../types/supabase'

export interface EventoConEstado {
  evento: EventoAgenda
  estado: 'programado' | 'proximo' | 'en_curso' | 'vencido' | 'finalizado'
}

interface Props {
  nombre: string
  activo: boolean
  resumen: { prestados: number; vencidos: number }
  prestados?: string[]
  tienePrestados?: boolean
  eventosDelDia?: EventoConEstado[]
  eventoAgenda?: EventoConEstado | null
  onPrestar?: () => void
  onDevolver?: () => void
  onHistorial?: () => void
  onToggleActivo?: () => void
  disabledButtons?: boolean
  loading?: boolean
}

export function LocationCard({
  nombre,
  activo,
  resumen,
  prestados = [],
  tienePrestados = false,
  eventosDelDia = [],
  eventoAgenda,
  onPrestar,
  onDevolver,
  onToggleActivo,
  loading,
  disabledButtons,
}: Props) {
  // Lista unificada de eventos de hoy
  const eventos = eventosDelDia.length > 0 ? eventosDelDia : eventoAgenda ? [eventoAgenda] : []

  const tieneEventoEnCurso = eventos.some((e) => e.estado === 'en_curso')
  const tieneEventoProximo = eventos.some((e) => e.estado === 'proximo')
  const tieneEventoVencido = eventos.some((e) => e.estado === 'vencido')

  // Alerta de prender: lugar en OFF con evento en curso
  const tieneAlertaPrender = !activo && tieneEventoEnCurso

  // Alerta de recuperar equipo: lugar en OFF con equipos prestados
  const tieneAlertaRecuperar = !activo && tienePrestados

  // Alerta de próximo evento: lugar en OFF 20 minutos antes del inicio
  const tieneAlertaProximo = !activo && tieneEventoProximo && !tieneAlertaPrender

  // Determinación de esquema de color principal de la tarjeta
  let bgClass = ''
  let dotClass = ''
  let titleClass = ''

  if (activo) {
    // 1. ON: Verde destacado
    bgClass = 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40 hover:border-emerald-400'
    dotClass = 'text-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
    titleClass = 'text-emerald-100'
  } else if (tieneAlertaPrender || tieneAlertaRecuperar || tieneEventoVencido) {
    // 2. OFF con evento en curso, equipos prestados o evento vencido: Rojo destacado
    bgClass = 'bg-red-950/40 border-red-600/80 shadow-lg shadow-red-950/40 hover:border-red-500'
    dotClass = 'text-red-500 animate-pulse'
    titleClass = 'text-red-100'
  } else if (tieneAlertaProximo) {
    // 3. OFF con evento agendado 20 min antes: Amarillo destacado
    bgClass = 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/40 hover:border-amber-400'
    dotClass = 'text-amber-400 animate-pulse'
    titleClass = 'text-amber-100'
  } else {
    // 4. OFF normal
    bgClass = 'bg-slate-950/60 border-slate-800/80 shadow-slate-950/50 hover:border-slate-700'
    dotClass = 'text-slate-600'
    titleClass = 'text-slate-100'
  }

  return (
    <div className={`relative card w-full border p-4 rounded-xl shadow-xl transition-all duration-200 space-y-3 ${bgClass}`}>
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Circle className={`size-3 shrink-0 ${dotClass}`} fill="currentColor" />
          <h3 className={`text-base sm:text-lg font-bold truncate ${titleClass}`}>
            {nombre}
          </h3>
        </div>
        {resumen.vencidos > 0 && (
          <div className="flex items-center gap-1 text-red-300 text-xs font-bold bg-red-950/80 px-2 py-0.5 rounded-lg border border-red-700">
            <TriangleAlert className="size-3.5" />
            {resumen.vencidos} vencido(s)
          </div>
        )}
      </div>

      {/* Banners de Alerta Específicos para lugares en OFF */}
      {!activo && (
        <div className="space-y-1.5">
          {tieneAlertaPrender && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/90 text-red-100 rounded-lg text-xs font-bold border border-red-500 animate-pulse shadow-md">
              <TriangleAlert className="size-4 text-red-300 shrink-0" />
              <span>⚠️ Evento en curso — ¡Prender lugar!</span>
            </div>
          )}

          {tieneAlertaProximo && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-900/80 text-amber-100 rounded-lg text-xs font-bold border border-amber-500 animate-pulse shadow-md">
              <Clock className="size-4 text-amber-300 shrink-0" />
              <span>⏰ Evento próximo (en &lt; 20 min) — ¡Prender lugar!</span>
            </div>
          )}

          {tieneAlertaRecuperar && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/90 text-red-100 rounded-lg text-xs font-bold border border-red-500 animate-pulse shadow-md">
              <TriangleAlert className="size-4 text-red-300 shrink-0" />
              <span>⚠️ {resumen.prestados} equipo(s) prestados — ¡Recuperar equipo!</span>
            </div>
          )}
        </div>
      )}

      {/* Estado de Préstamos */}
      <div className="text-xs sm:text-sm">
        <span className={tieneAlertaRecuperar ? 'text-red-300 font-semibold' : 'text-slate-400'}>
          {resumen.prestados} equipo(s) prestado(s)
        </span>
      </div>

      {/* Tags de equipos prestados */}
      {prestados.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 text-[11px]">
          {prestados.map((code) => (
            <li
              key={code}
              className={`px-2 py-0.5 rounded font-mono font-semibold tracking-wide border ${
                tieneAlertaRecuperar
                  ? 'bg-red-900/50 text-red-200 border-red-700'
                  : activo
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                  : 'bg-slate-950 text-cyan-300 border-slate-800'
              }`}
            >
              {code}
            </li>
          ))}
        </ul>
      )}

      {/* Sección Eventos Agendados de Hoy */}
      {eventos.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span className="flex items-center gap-1 text-cyan-300">
              <Calendar className="size-3.5 text-cyan-400" />
              <span>Eventos de Hoy</span>
            </span>
            <span className="px-1.5 py-0.2 text-[10px] bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20 font-bold">
              {eventos.length}
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
            {eventos.map(({ evento, estado }) => (
              <div
                key={evento.id}
                className={`p-2 rounded-lg text-xs border transition-all ${
                  estado === 'en_curso'
                    ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-100 shadow-sm shadow-emerald-950/40'
                    : estado === 'proximo'
                    ? 'bg-amber-950/70 border-amber-500/80 text-amber-100 animate-pulse'
                    : estado === 'vencido'
                    ? 'bg-red-950/60 border-red-700/80 text-red-100'
                    : 'bg-slate-950/80 border-slate-800/90 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                    <Clock className="size-3 text-cyan-400" />
                    {evento.hora_inicio} - {evento.hora_fin}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide border ${
                      estado === 'en_curso'
                        ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500'
                        : estado === 'proximo'
                        ? 'bg-amber-900/90 text-amber-100 border-amber-400'
                        : estado === 'vencido'
                        ? 'bg-red-900/90 text-red-100 border-red-500'
                        : estado === 'finalizado'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-slate-800/90 text-slate-300 border-slate-700'
                    }`}
                  >
                    {estado === 'en_curso' && '🟢 En curso'}
                    {estado === 'proximo' && '⏰ Próximo'}
                    {estado === 'vencido' && '⚠️ ¡Apagar!'}
                    {estado === 'finalizado' && '✓ Finalizado'}
                    {estado === 'programado' && '📅 Agendado'}
                  </span>
                </div>

                <p className="font-semibold text-slate-100 text-xs mt-1 truncate">
                  {evento.titulo || 'Sin título'}
                </p>

                {evento.responsable && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                    <User className="size-3 text-slate-500 shrink-0" />
                    <span>{evento.responsable}</span>
                  </p>
                )}

                {evento.descripcion && (
                  <p className="text-[10px] text-slate-400/90 mt-0.5 line-clamp-1 italic">
                    {evento.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="pt-1 grid grid-cols-3 gap-2">
        <button
          className={`btn text-xs font-bold py-1.5 rounded-lg cursor-pointer transition-all inline-flex items-center justify-center ${
            activo
              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={onToggleActivo}
          disabled={disabledButtons}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
          {activo ? 'ON' : 'OFF'}
        </button>
        <button
          className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs py-1.5 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onPrestar}
          disabled={disabledButtons}
        >
          <Plus className="size-3.5" />
          <span>Prestar</span>
        </button>
        <button
          className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-1.5 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onDevolver}
          disabled={disabledButtons}
        >
          <RotateCcw className="size-3.5 text-cyan-400" />
          <span>Recuperar</span>
        </button>
      </div>
    </div>
  )
}


