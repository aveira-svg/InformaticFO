import { useEffect, useMemo, useState } from 'react'
import { listenLugares, setEstadoLugar } from '../services/lugares'
import { listenPrestamosActivos, listenTodosPrestamos } from '../services/prestamos'
import { listenEventosAgenda } from '../services/eventosAgenda'
import { getEquiposByIds } from '../services/equipos'
import type { Lugar, Prestamo, EventoAgenda, Equipo } from '../types/supabase'
import { LocationCard } from '../components/LocationCard/LocationCard'
import { EventLog } from '../components/EventLog/EventLog'
import { LoanForm } from '../components/LoanForm/LoanForm'
import { RecoverForm } from '../components/LoanForm/RecoverForm'
import { Bell, Monitor, RefreshCw, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [todosPrestamos, setTodosPrestamos] = useState<Prestamo[]>([])
  const [eventosAgenda, setEventosAgenda] = useState<EventoAgenda[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedLugarId, setSelectedLugarId] = useState<string | null>(null)
  const [showRecover, setShowRecover] = useState(false)
  const [equiposMap, setEquiposMap] = useState<Map<string, Equipo>>(new Map())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    const off1 = listenLugares(setLugares)
    const off2 = listenPrestamosActivos(setPrestamos)
    const off3 = listenTodosPrestamos(setTodosPrestamos)
    const off4 = listenEventosAgenda(setEventosAgenda)
    return () => {
      off1()
      off2()
      off3()
      off4()
    }
  }, [])

  // Actualizar hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Solicitar permiso de notificaciones
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  // Notificaciones para eventos de hoy
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const notificacionesEnviadas = new Set<string>()

    const checkEventos = () => {
      const ahora = new Date()
      const hoyInicio = new Date(ahora)
      hoyInicio.setHours(0, 0, 0, 0)
      const hoyFin = new Date(ahora)
      hoyFin.setHours(23, 59, 59, 999)

      eventosAgenda.forEach((evento) => {
        if (!evento.fecha) return
        const [year, month, day] = evento.fecha.split('-').map(Number)
        const fechaEvento = new Date(year, month - 1, day)

        if (fechaEvento < hoyInicio || fechaEvento > hoyFin) return

        const lugar = lugares.find((l) => l.id === evento.lugar_id)
        if (!lugar) return

        const [horaInicioH, horaInicioM] = (evento.hora_inicio || '00:00').split(':').map(Number)
        const [horaFinH, horaFinM] = (evento.hora_fin || '00:00').split(':').map(Number)

        const inicioEvento = new Date(fechaEvento)
        inicioEvento.setHours(horaInicioH, horaInicioM, 0, 0)

        const finEvento = new Date(fechaEvento)
        finEvento.setHours(horaFinH, horaFinM, 0, 0)

        const alertaInicio = new Date(inicioEvento.getTime() - 20 * 60 * 1000)
        const margenAlerta = 60000

        const keyInicio = `inicio-${evento.id}`
        if (!notificacionesEnviadas.has(keyInicio)) {
          const diffInicio = ahora.getTime() - alertaInicio.getTime()
          if (diffInicio >= 0 && diffInicio < margenAlerta) {
            new Notification('📅 Evento próximo', {
              body: `${evento.titulo || 'Evento'} en ${lugar.nombre} comienza en 20 minutos (${evento.hora_inicio})`,
              icon: '/favicon.ico',
              tag: keyInicio,
            })
            notificacionesEnviadas.add(keyInicio)
          }
        }

        const keyFin = `fin-${evento.id}`
        if (!notificacionesEnviadas.has(keyFin)) {
          const diffFin = ahora.getTime() - finEvento.getTime()
          if (diffFin >= 0 && diffFin < margenAlerta) {
            new Notification('⏰ Evento finalizado', {
              body: `${evento.titulo || 'Evento'} en ${lugar.nombre} ha finalizado.`,
              icon: '/favicon.ico',
              tag: keyFin,
            })
            notificacionesEnviadas.add(keyFin)
          }
        }
      })
    }

    checkEventos()
    const interval = setInterval(checkEventos, 60000)
    return () => clearInterval(interval)
  }, [eventosAgenda, lugares])

  // Obtener equipos por IDs
  useEffect(() => {
    const ids = Array.from(new Set(prestamos.filter((p) => p.estado === 'prestado').map((p) => p.equipo_id)))
    if (!ids.length) {
      setEquiposMap(new Map())
      return
    }
    getEquiposByIds(ids).then(setEquiposMap)
  }, [prestamos])

  // Resumen por lugar
  const resumenPorLugar = useMemo(() => {
    const map = new Map<string, { prestados: number; vencidos: number }>()
    for (const l of lugares) map.set(l.id, { prestados: 0, vencidos: 0 })
    const now = Date.now()
    for (const p of prestamos) {
      const r = map.get(p.lugar_id) || { prestados: 0, vencidos: 0 }
      const isPrestado = p.estado === 'prestado'
      const due = p.fecha_devolucion ? new Date(p.fecha_devolucion).getTime() : undefined
      const isVencido = isPrestado && typeof due === 'number' && due < now
      if (isPrestado) r.prestados += 1
      if (isVencido) r.vencidos += 1
      map.set(p.lugar_id, r)
    }
    return map
  }, [lugares, prestamos])

  // Eventos por lugar
  const eventosPorLugar = useMemo(() => {
    const map = new Map<string, { evento: EventoAgenda; estado: 'proximo' | 'en_curso' | 'vencido' } | null>()
    const ahora = currentTime
    const hoyInicio = new Date(ahora)
    hoyInicio.setHours(0, 0, 0, 0)
    const hoyFin = new Date(ahora)
    hoyFin.setHours(23, 59, 59, 999)

    for (const l of lugares) {
      const eventosDelLugar = eventosAgenda.filter((e) => {
        if (!e.fecha) return false
        const [year, month, day] = e.fecha.split('-').map(Number)
        const fechaEvento = new Date(year, month - 1, day)
        return fechaEvento >= hoyInicio && fechaEvento <= hoyFin && e.lugar_id === l.id
      })

      let eventoRelevante: { evento: EventoAgenda; estado: 'proximo' | 'en_curso' | 'vencido' } | null = null

      for (const evento of eventosDelLugar) {
        const [year, month, day] = evento.fecha.split('-').map(Number)
        const fechaEvento = new Date(year, month - 1, day)
        const [horaInicioH, horaInicioM] = (evento.hora_inicio || '00:00').split(':').map(Number)
        const [horaFinH, horaFinM] = (evento.hora_fin || '00:00').split(':').map(Number)

        const inicioEvento = new Date(fechaEvento)
        inicioEvento.setHours(horaInicioH, horaInicioM, 0, 0)

        const finEvento = new Date(fechaEvento)
        finEvento.setHours(horaFinH, horaFinM, 0, 0)

        const inicioAlerta = new Date(inicioEvento.getTime() - 20 * 60 * 1000)

        if (ahora >= inicioAlerta && ahora < inicioEvento && l.activo) {
          eventoRelevante = { evento, estado: 'proximo' }
          break
        } else if (ahora >= inicioEvento && ahora <= finEvento) {
          eventoRelevante = { evento, estado: 'en_curso' }
          break
        } else if (ahora > finEvento && l.activo) {
          if (!eventoRelevante) {
            eventoRelevante = { evento, estado: 'vencido' }
          }
        }
      }

      map.set(l.id, eventoRelevante)
    }

    return map
  }, [lugares, eventosAgenda, currentTime])

  // Ordenar lugares
  const lugaresFiltrados = useMemo(() => {
    const frecuenciaPorLugar = new Map<string, number>()
    for (const p of todosPrestamos) {
      frecuenciaPorLugar.set(p.lugar_id, (frecuenciaPorLugar.get(p.lugar_id) || 0) + 1)
    }

    return [...lugares].sort((a, b) => {
      const eventoA = eventosPorLugar.get(a.id)
      const eventoB = eventosPorLugar.get(b.id)
      const tieneAlertaA = eventoA && (eventoA.estado === 'proximo' || eventoA.estado === 'vencido')
      const tieneAlertaB = eventoB && (eventoB.estado === 'proximo' || eventoB.estado === 'vencido')

      if (tieneAlertaA && !tieneAlertaB) return -1
      if (!tieneAlertaA && tieneAlertaB) return 1

      const tienePrestadosA = (resumenPorLugar.get(a.id)?.prestados || 0) > 0
      const tienePrestadosB = (resumenPorLugar.get(b.id)?.prestados || 0) > 0

      if (tienePrestadosA && !tienePrestadosB) return -1
      if (!tienePrestadosA && tienePrestadosB) return 1

      if (a.activo && !b.activo) return -1
      if (!a.activo && b.activo) return 1

      const freqA = frecuenciaPorLugar.get(a.id) || 0
      const freqB = frecuenciaPorLugar.get(b.id) || 0
      return freqB - freqA
    })
  }, [lugares, todosPrestamos, resumenPorLugar, eventosPorLugar])

  const totalPrestadosCount = useMemo(() => {
    return prestamos.filter((p) => p.estado === 'prestado').length
  }, [prestamos])

  return (
    <div className="space-y-6">
      {/* Alerta de Notificaciones */}
      {notificationPermission !== 'granted' && eventosAgenda.length > 0 && (
        <div className="card bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl flex items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-amber-400 animate-bounce" />
            <div>
              <p className="text-sm font-semibold text-amber-100">Notificaciones de eventos desactivadas</p>
              <p className="text-xs text-amber-300/80">Actívalas para recibir alertas sobre eventos próximos y cierres.</p>
            </div>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="btn bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs rounded-lg whitespace-nowrap cursor-pointer"
          >
            Activar
          </button>
        </div>
      )}

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <Monitor className="size-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Lugares Configurados</p>
            <p className="text-2xl font-extrabold text-slate-100">{lugares.length}</p>
          </div>
        </div>

        <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <RefreshCw className="size-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Préstamos Activos</p>
            <p className="text-2xl font-extrabold text-cyan-400">{totalPrestadosCount}</p>
          </div>
        </div>

        <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <CheckCircle className="size-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Lugares Activos (ON)</p>
            <p className="text-2xl font-extrabold text-emerald-400">{lugares.filter((l) => l.activo).length}</p>
          </div>
        </div>
      </div>

      {/* Grid de Lugares */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Ubicaciones e Infraestructura</span>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-cyan-400 rounded-full border border-slate-700">
              {lugares.length}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {lugaresFiltrados.map((l) => {
            const resumen = resumenPorLugar.get(l.id) || { prestados: 0, vencidos: 0 }
            const tienePrestados = resumen.prestados > 0
            const eventoInfo = eventosPorLugar.get(l.id)

            return (
              <LocationCard
                key={l.id}
                nombre={l.nombre}
                activo={l.activo}
                resumen={resumen}
                tienePrestados={tienePrestados}
                prestados={prestamos
                  .filter((p) => p.lugar_id === l.id && p.estado === 'prestado')
                  .map((p) => equiposMap.get(p.equipo_id)?.codigo_unico || p.equipo_id)}
                eventoAgenda={eventoInfo}
                onPrestar={() => {
                  setSelectedLugarId(l.id)
                  setShowForm(true)
                }}
                onDevolver={() => {
                  setSelectedLugarId(l.id)
                  setShowRecover(true)
                }}
                onToggleActivo={() => setEstadoLugar(l.id, !l.activo)}
              />
            )
          })}
        </div>
      </div>

      {/* Modales */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="font-bold text-slate-100 text-base">Registrar Préstamo de Equipo</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <LoanForm lugarId={selectedLugarId ?? ''} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {showRecover && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="font-bold text-slate-100 text-base">Recuperar / Devolver Equipos</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setShowRecover(false)}>
                ✕
              </button>
            </div>
            <RecoverForm
              lugarId={selectedLugarId ?? ''}
              prestamos={prestamos}
              equiposMap={equiposMap}
              onClose={() => setShowRecover(false)}
            />
          </div>
        </div>
      )}

      {/* Bitácora de Eventos */}
      <div>
        <EventLog />
      </div>
    </div>
  )
}
