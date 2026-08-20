import { useEffect, useMemo, useState } from 'react'
import { listenLugares, getLugares, setDisponibleLugar } from '../services/lugares'
import { listenPrestamosActivos, listenTodosPrestamos, getPrestamosActivos, getTodosPrestamos } from '../services/prestamos'
import { listenEventosAgenda } from '../services/eventosAgenda'
import { getEquiposByIds } from '../services/equipos'
import type { Lugar, Prestamo, EventoAgenda, Equipo } from '../types/supabase'
import { LocationCard, type EventoConEstado } from '../components/LocationCard/LocationCard'
import { EventLog } from '../components/EventLog/EventLog'
import { LoanForm } from '../components/LoanForm/LoanForm'
import { RecoverForm } from '../components/LoanForm/RecoverForm'
import { PersonalLoanForm } from '../components/LoanForm/PersonalLoanForm'
import { PersonalLoanCard, type PersonalLoanGroup } from '../components/PersonalLoanCard/PersonalLoanCard'
import { Bell, RefreshCw, CheckCircle, UserPlus, UserCheck, CalendarDays } from 'lucide-react'

export default function Dashboard() {
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [todosPrestamos, setTodosPrestamos] = useState<Prestamo[]>([])
  const [eventosAgenda, setEventosAgenda] = useState<EventoAgenda[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedLugarId, setSelectedLugarId] = useState<string | null>(null)
  const [showRecover, setShowRecover] = useState(false)
  const [showPersonalForm, setShowPersonalForm] = useState(false)
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)
    return () => clearInterval(interval)
  }, [])

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

  const handleRefresh = async () => {
    try {
      const [l, p, tp] = await Promise.all([
        getLugares(),
        getPrestamosActivos(),
        getTodosPrestamos(),
      ])
      setLugares(l)
      setPrestamos(p)
      setTodosPrestamos(tp)
      const ids = Array.from(new Set(p.map((item) => item.equipo_id)))
      if (ids.length) {
        const map = await getEquiposByIds(ids)
        setEquiposMap(map)
      } else {
        setEquiposMap(new Map())
      }
    } catch (err) {
      console.error('Error refreshing dashboard:', err)
    }
  }

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const handleToggleActivo = async (lugarId: string, currentDisponible: boolean) => {
    setTogglingId(lugarId)
    setLugares((prev) =>
      prev.map((l) => (l.id === lugarId ? { ...l, disponible: !currentDisponible } : l))
    )
    try {
      await setDisponibleLugar(lugarId, !currentDisponible)
    } catch (err) {
      console.error('Error toggling disponible:', err)
      setLugares((prev) =>
        prev.map((l) => (l.id === lugarId ? { ...l, disponible: currentDisponible } : l))
      )
    } finally {
      setTogglingId(null)
    }
  };

  const handlePrestar = (lugarId: string) => {
    setSelectedLugarId(lugarId);
    setShowForm(true);
  };

  const handleDevolver = (lugarId: string) => {
    setSelectedLugarId(lugarId);
    setShowRecover(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedLugarId(null);
  };

  const closeRecover = () => {
    setShowRecover(false);
    setSelectedLugarId(null);
  };

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const notificacionesEnviadas = new Set<string>()

    const checkEventos = () => {
      const ahora = new Date()
      const yyyy = ahora.getFullYear()
      const mm = String(ahora.getMonth() + 1).padStart(2, '0')
      const dd = String(ahora.getDate()).padStart(2, '0')
      const hoyStr = `${yyyy}-${mm}-${dd}`

      eventosAgenda.forEach((evento) => {
        if (!evento.fecha || evento.fecha !== hoyStr) return

        const lugar = lugares.find((l) => l.id === evento.lugar_id)
        if (!lugar) return

        const [horaInicioH, horaInicioM] = (evento.hora_inicio || '00:00').split(':').map(Number)
        const [horaFinH, horaFinM] = (evento.hora_fin || '00:00').split(':').map(Number)

        const inicioEvento = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), horaInicioH, horaInicioM, 0)
        const finEvento = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), horaFinH, horaFinM, 0)

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

  useEffect(() => {
    const ids = Array.from(new Set(prestamos.filter((p) => p.estado === 'prestado').map((p) => p.equipo_id)))
    if (!ids.length) {
      setEquiposMap(new Map())
      return
    }
    getEquiposByIds(ids).then(setEquiposMap)
  }, [prestamos])

  const isPersonalLoan = (p: Prestamo) =>
    p.lugar_id === '00000000-0000-0000-0000-000000000000' ||
    Boolean(p.observaciones?.startsWith('[PERSONAL]'))

  const resumenPorLugar = useMemo(() => {
    const map = new Map<string, { prestados: number; vencidos: number }>()
    for (const l of lugares) map.set(l.id, { prestados: 0, vencidos: 0 })
    const now = Date.now()
    for (const p of prestamos) {
      if (isPersonalLoan(p)) continue
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

  const personalLoanGroups = useMemo(() => {
    const personalLoans = prestamos.filter(
      (p) => p.estado === 'prestado' && isPersonalLoan(p)
    )

    const groupsMap = new Map<string, PersonalLoanGroup>()

    for (const p of personalLoans) {
      const key = `${p.responsable.trim().toLowerCase()}`
      const code = equiposMap.get(p.equipo_id)?.codigo_unico || p.equipo_id

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          responsable: p.responsable,
          prestamoIds: [p.id],
          equiposCodigos: [code],
          fecha: p.fecha_prestamo,
          observaciones: p.observaciones,
        })
      } else {
        const g = groupsMap.get(key)!
        g.prestamoIds.push(p.id)
        if (!g.equiposCodigos.includes(code)) {
          g.equiposCodigos.push(code)
        }
      }
    }
    return Array.from(groupsMap.values())
  }, [prestamos, equiposMap])

  const eventosPorLugar = useMemo(() => {
    const map = new Map<string, { eventos: EventoConEstado[]; eventoAlerta: EventoConEstado | null }>()
    const ahora = currentTime
    const yyyy = ahora.getFullYear()
    const mm = String(ahora.getMonth() + 1).padStart(2, '0')
    const dd = String(ahora.getDate()).padStart(2, '0')
    const hoyStr = `${yyyy}-${mm}-${dd}`

    for (const l of lugares) {
      const eventosDelLugar = eventosAgenda
        .filter((e) => e.fecha === hoyStr && e.lugar_id === l.id)
        .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))

      const eventosConEstado: EventoConEstado[] = eventosDelLugar.map((evento) => {
        const [horaInicioH, horaInicioM] = (evento.hora_inicio || '00:00').split(':').map(Number)
        const [horaFinH, horaFinM] = (evento.hora_fin || '00:00').split(':').map(Number)

        const inicioEvento = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), horaInicioH, horaInicioM, 0)
        const finEvento = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), horaFinH, horaFinM, 0)
        const inicioAlerta = new Date(inicioEvento.getTime() - 20 * 60 * 1000)
        const margenApagar = new Date(finEvento.getTime() + 45 * 60 * 1000)

        let estado: 'programado' | 'proximo' | 'en_curso' | 'vencido' | 'finalizado' = 'programado'

        if (ahora >= inicioAlerta && ahora < inicioEvento) {
          estado = 'proximo'
        } else if (ahora >= inicioEvento && ahora <= finEvento) {
          estado = 'en_curso'
        } else if (ahora > finEvento && ahora <= margenApagar) {
          estado = 'vencido'
        } else if (ahora > margenApagar) {
          estado = 'finalizado'
        } else {
          estado = 'programado'
        }

        return { evento, estado }
      })

      const eventoAlerta =
        eventosConEstado.find((e) => e.estado === 'en_curso') ||
        eventosConEstado.find((e) => e.estado === 'proximo') ||
        eventosConEstado.find((e) => e.estado === 'vencido') ||
        eventosConEstado.find((e) => e.estado === 'programado') ||
        eventosConEstado[0] ||
        null

      map.set(l.id, { eventos: eventosConEstado, eventoAlerta })
    }

    return map
  }, [lugares, eventosAgenda, currentTime])

  const lugaresFiltrados = useMemo(() => {
    const visibles = lugares.filter((l) => l.activo)
    const frecuenciaPorLugar = new Map<string, number>()
    for (const p of todosPrestamos) {
      frecuenciaPorLugar.set(p.lugar_id, (frecuenciaPorLugar.get(p.lugar_id) || 0) + 1)
    }

    return [...visibles].sort((a, b) => {
      const infoA = eventosPorLugar.get(a.id)
      const infoB = eventosPorLugar.get(b.id)

      const getEventScore = (info?: { eventos: EventoConEstado[] }) => {
        if (!info || info.eventos.length === 0) return 0
        if (info.eventos.some((e) => e.estado === 'en_curso')) return 4
        if (info.eventos.some((e) => e.estado === 'proximo')) return 3
        if (info.eventos.some((e) => e.estado === 'vencido')) return 2
        if (info.eventos.some((e) => e.estado === 'programado')) return 1
        return 0
      }

      const scoreA = getEventScore(infoA)
      const scoreB = getEventScore(infoB)
      if (scoreA !== scoreB) return scoreB - scoreA

      const tienePrestadosA = (resumenPorLugar.get(a.id)?.prestados || 0) > 0
      const tienePrestadosB = (resumenPorLugar.get(b.id)?.prestados || 0) > 0

      if (tienePrestadosA && !tienePrestadosB) return -1
      if (!tienePrestadosA && tienePrestadosB) return 1

      const freqA = frecuenciaPorLugar.get(a.id) || 0
      const freqB = frecuenciaPorLugar.get(b.id) || 0
      return freqB - freqA
    })
  }, [lugares, todosPrestamos, resumenPorLugar, eventosPorLugar])

  const totalPrestadosCount = useMemo(() => {
    return prestamos.filter((p) => p.estado === 'prestado').length
  }, [prestamos])

  const totalEventosHoyCount = useMemo(() => {
    const ahora = currentTime
    const yyyy = ahora.getFullYear()
    const mm = String(ahora.getMonth() + 1).padStart(2, '0')
    const dd = String(ahora.getDate()).padStart(2, '0')
    const hoyStr = `${yyyy}-${mm}-${dd}`
    return eventosAgenda.filter((e) => e.fecha === hoyStr).length
  }, [eventosAgenda, currentTime])

  const totalLugaresActivosCount = useMemo(() => {
    return lugaresFiltrados.filter((l) => l.disponible ?? true).length
  }, [lugaresFiltrados])

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <CalendarDays className="size-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Eventos de Hoy</p>
            <p className="text-2xl font-extrabold text-indigo-400">{totalEventosHoyCount}</p>
          </div>
        </div>

        <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <CheckCircle className="size-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Lugares Activos</p>
            <p className="text-2xl font-extrabold text-emerald-400">{totalLugaresActivosCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Ubicaciones e Infraestructura</span>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-cyan-400 rounded-full border border-slate-700">
              {lugaresFiltrados.length}
            </span>
          </h2>
          <button
            onClick={() => setShowPersonalForm(true)}
            className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-900/30 transition-all"
          >
            <UserPlus className="size-4" />
            <span>Único Préstamo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {lugaresFiltrados.map((l) => {
            const resumen = resumenPorLugar.get(l.id) || { prestados: 0, vencidos: 0 }
            const tienePrestados = resumen.prestados > 0
            const eventosInfo = eventosPorLugar.get(l.id)
            const estaDisponible = l.disponible ?? true

            return (
              <LocationCard
                key={l.id}
                nombre={l.nombre}
                activo={estaDisponible}
                loading={togglingId === l.id}
                resumen={resumen}
                tienePrestados={tienePrestados}
                prestados={prestamos
                  .filter((p) => p.lugar_id === l.id && p.estado === 'prestado')
                  .map((p) => equiposMap.get(p.equipo_id)?.codigo_unico || p.equipo_id)}
                eventosDelDia={eventosInfo?.eventos || []}
                eventoAgenda={eventosInfo?.eventoAlerta || null}
                disabledButtons={togglingId === l.id}
                onToggleActivo={() => handleToggleActivo(l.id, estaDisponible)}
                onPrestar={() => handlePrestar(l.id)}
                onDevolver={() => handleDevolver(l.id)}
              />
            )
          })}
        </div>
      </div>

      {personalLoanGroups.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
              <UserCheck className="size-5 text-indigo-400" />
              <span>Únicos Préstamos</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {personalLoanGroups.map((g) => (
              <PersonalLoanCard
                key={`${g.responsable}_${g.fecha}`}
                loanGroup={g}
                onSuccess={handleRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modales */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="font-bold text-slate-100 text-base">Registrar Préstamo de Equipo</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={closeForm}>
                ✕
              </button>
            </div>
            <LoanForm lugarId={selectedLugarId ?? ''} onClose={closeForm} onSuccess={handleRefresh} />
          </div>
        </div>
      )}

      {showRecover && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="font-bold text-slate-100 text-base">Recuperar / Devolver Equipos</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={closeRecover}>
                ✕
              </button>
            </div>
            <RecoverForm
              lugarId={selectedLugarId ?? ''}
              prestamos={prestamos}
              equiposMap={equiposMap}
              onClose={closeRecover}
              onSuccess={handleRefresh}
            />
          </div>
        </div>
      )}

      {showPersonalForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="font-bold text-slate-100 text-base">Registrar Único Préstamo</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setShowPersonalForm(false)}>
                ✕
              </button>
            </div>
            <PersonalLoanForm
              onClose={() => setShowPersonalForm(false)}
              onSuccess={handleRefresh}
              fallbackLugarId={lugares[0]?.id}
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

