import React, { useEffect, useMemo, useState } from 'react'
import {
  listenEventosAgenda,
  addEventosAgendaRecurrentes,
  deleteEventoAgenda,
} from '../services/eventosAgenda'
import { listenLugares } from '../services/lugares'
import type { EventoAgenda, Lugar } from '../types/supabase'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Repeat,
  Grid,
  CalendarDays,
} from 'lucide-react'

export default function AgendaPage() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [lugares, setLugares] = useState<Lugar[]>([])

  // Control de vista y navegación de fecha (Por defecto: Día)
  const [viewMode, setViewMode] = useState<'dia' | 'semana'>('dia')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Formulario Modal
  const [showAddForm, setShowAddForm] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('10:00')
  const [lugarId, setLugarId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [responsable, setResponsable] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [semanasRepeticion, setSemanasRepeticion] = useState(1)
  const [saving, setSaving] = useState(false)

  // Filtro de lugar
  const [filterLugar, setFilterLugar] = useState('')

  useEffect(() => {
    const off1 = listenEventosAgenda(setEventos)
    const off2 = listenLugares(setLugares)
    return () => {
      off1()
      off2()
    }
  }, [])

  const lugaresVisibles = useMemo(() => lugares.filter((l) => l.activo), [lugares])

  useEffect(() => {
    if (lugaresVisibles.length > 0 && !lugarId) {
      setLugarId(lugaresVisibles[0].id)
    }
  }, [lugaresVisibles, lugarId])

  const lugaresMap = useMemo(() => {
    const m = new Map<string, Lugar>()
    lugares.forEach((l) => m.set(l.id, l))
    return m
  }, [lugares])

  // Navegación de fechas (Anterior / Siguiente / Hoy)
  const navigateDate = (amount: number) => {
    const next = new Date(selectedDate)
    if (viewMode === 'dia') {
      next.setDate(next.getDate() + amount)
    } else {
      next.setDate(next.getDate() + amount * 7)
    }
    setSelectedDate(next)
  }

  const setToday = () => {
    setSelectedDate(new Date())
  }

  // Días de la semana de Lunes a Sábado
  const diasSemana = useMemo(() => {
    const current = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    const dayOfWeek = current.getDay() // 0: Dom, 1: Lun...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek

    const monday = new Date(current)
    monday.setDate(current.getDate() + diffToMonday)

    const dias: { nombre: string; fechaStr: string; dateObj: Date }[] = []
    const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dias.push({
        nombre: nombresDias[i],
        fechaStr: `${yyyy}-${mm}-${dd}`,
        dateObj: d,
      })
    }
    return dias
  }, [selectedDate])

  // Etiqueta legible de rango de fecha
  const dateRangeLabel = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }

    if (viewMode === 'dia') {
      return selectedDate.toLocaleDateString('es-ES', options)
    } else {
      const startFormat = diasSemana[0].dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      const endFormat = diasSemana[5].dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      return `Semana del ${startFormat} al ${endFormat} (Lunes a Sábado)`
    }
  }, [selectedDate, viewMode, diasSemana])

  // Filtrar eventos por el período (Día o Semana de Lunes a Sábado) y lugar
  const eventosFiltrados = useMemo(() => {
    let startRange: Date
    let endRange: Date

    if (viewMode === 'dia') {
      startRange = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
      endRange = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999)
    } else {
      startRange = new Date(diasSemana[0].dateObj)
      startRange.setHours(0, 0, 0, 0)

      endRange = new Date(diasSemana[5].dateObj)
      endRange.setHours(23, 59, 59, 999)
    }

    return eventos.filter((e) => {
      if (!e.fecha) return false
      const [year, month, day] = e.fecha.split('-').map(Number)
      const fechaEv = new Date(year, month - 1, day, 12, 0, 0)

      const matchDate = fechaEv >= startRange && fechaEv <= endRange
      const matchLugar = !filterLugar || e.lugar_id === filterLugar

      return matchDate && matchLugar
    })
  }, [eventos, selectedDate, viewMode, filterLugar, diasSemana])

  // Validar conflicto de horarios
  const checkConflicts = (
    baseFechaStr: string,
    hInicio: string,
    hFin: string,
    lId: string,
    semanasCount: number
  ) => {
    const [year, month, day] = baseFechaStr.split('-').map(Number)
    const baseDate = new Date(year, month - 1, day, 12, 0, 0)

    const [horaInicioH, horaInicioM] = hInicio.split(':').map(Number)
    const [horaFinH, horaFinM] = hFin.split(':').map(Number)
    const inicioNuevo = horaInicioH * 60 + horaInicioM
    const finNuevo = horaFinH * 60 + horaFinM

    for (let i = 0; i < semanasCount; i++) {
      const targetDate = new Date(baseDate)
      targetDate.setDate(baseDate.getDate() + i * 7)

      const targetY = targetDate.getFullYear()
      const targetM = targetDate.getMonth()
      const targetD = targetDate.getDate()

      for (const ev of eventos) {
        if (ev.lugar_id !== lId || !ev.fecha) continue
        const [eY, eM, eD] = ev.fecha.split('-').map(Number)

        if (eY === targetY && eM - 1 === targetM && eD === targetD) {
          const [eHInicioH, eHInicioM] = (ev.hora_inicio || '00:00').split(':').map(Number)
          const [eHFinH, eHFinM] = (ev.hora_fin || '00:00').split(':').map(Number)
          const inicioExistente = eHInicioH * 60 + eHInicioM
          const finExistente = eHFinH * 60 + eHFinM

          const hayConflicto =
            (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) ||
            (finNuevo > inicioExistente && finNuevo <= finExistente) ||
            (inicioNuevo <= inicioExistente && finNuevo >= finExistente)

          if (hayConflicto) {
            return {
              conflicto: true,
              fechaConflicto: targetDate.toLocaleDateString('es-ES'),
              tituloConflicto: ev.titulo || 'Reserva existente',
            }
          }
        }
      }
    }
    return { conflicto: false }
  }

  // Guardar eventos
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fecha || !horaInicio || !horaFin || !lugarId) return

    const { conflicto, fechaConflicto, tituloConflicto } = checkConflicts(
      fecha,
      horaInicio,
      horaFin,
      lugarId,
      semanasRepeticion
    )

    if (conflicto) {
      const lugarNom = lugaresMap.get(lugarId)?.nombre || 'la ubicación'
      alert(
        `⚠️ Conflicto de horario detectado\n\n` +
          `La fecha ${fechaConflicto} ya tiene agendado:\n` +
          `"${tituloConflicto}" en ${lugarNom}.\n\n` +
          `Por favor, ajusta los horarios o el lugar.`
      )
      return
    }

    setSaving(true)
    try {
      await addEventosAgendaRecurrentes(
        {
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          lugar_id: lugarId,
          titulo: titulo.trim() || undefined,
          descripcion: descripcion.trim() || undefined,
          responsable: responsable.trim() || undefined,
        },
        semanasRepeticion
      )
      setShowAddForm(false)
      setTitulo('')
      setDescripcion('')
      setResponsable('')
      setSemanasRepeticion(1)
    } catch (err) {
      console.error(err)
      alert('Error al guardar en la agenda')
    } finally {
      setSaving(false)
    }
  }

  // Borrado lógico
  async function handleDelete(id: string) {
    if (!confirm('¿Dar de baja esta reserva de la agenda?')) return
    try {
      await deleteEventoAgenda(id)
    } catch (err) {
      console.error(err)
      alert('Error al eliminar la reserva')
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="size-6 text-cyan-400" />
            <span>Agenda de Aulas y Eventos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Planificación de clases, mantenimientos y reservas de infraestructura</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs py-2.5 px-4 rounded-lg inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          <Plus className="size-4" />
          <span>Nueva Reserva</span>
        </button>
      </div>

      {/* Navegador por Día / Semana */}
      <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Selector Día / Semana */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('dia')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'dia' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="size-3.5" />
              <span>Día</span>
            </button>
            <button
              onClick={() => setViewMode('semana')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'semana' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="size-3.5" />
              <span>Semana</span>
            </button>
          </div>

          {/* Navegador con Flechas y Botón Hoy */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 rounded-lg cursor-pointer transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={setToday}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 hover:text-cyan-400 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 rounded-lg cursor-pointer transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Filtro de lugar */}
          <div>
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              value={filterLugar}
              onChange={(e) => setFilterLugar(e.target.value)}
            >
              <option value="">Todos los Lugares</option>
              {lugaresVisibles.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Título del rango/día */}
        <div className="text-center py-2 border-t border-slate-800/80">
          <h3 className="text-sm sm:text-base font-bold text-cyan-400 capitalize">{dateRangeLabel}</h3>
        </div>
      </div>

      {/* Modal / Formulario Nueva Reserva */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-base">Registrar Reserva en Agenda</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setShowAddForm(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Hora Fin</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Ubicación / Aula</label>
                <select
                  required
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  value={lugarId}
                  onChange={(e) => setLugarId(e.target.value)}
                >
                  {lugaresVisibles.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Título o Asignatura</label>
                <input
                  type="text"
                  required
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Ej: Odontología Preventiva II"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Responsable / Docente</label>
                <input
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Ej: Dr. Fernando Pérez"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Repeat className="size-3.5 text-cyan-400" />
                  <span>Repetición Semanal</span>
                </label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-cyan-300 outline-none focus:border-cyan-500 font-medium"
                  value={semanasRepeticion}
                  onChange={(e) => setSemanasRepeticion(Number(e.target.value))}
                >
                  <option value={1}>Sin repetición (Solo esta fecha)</option>
                  <option value={2}>Repetir por 2 semanas seguidas</option>
                  <option value={4}>Repetir por 4 semanas (1 mes)</option>
                  <option value={8}>Repetir por 8 semanas (2 meses)</option>
                  <option value={12}>Repetir por 12 semanas (Cuatrimestre)</option>
                  <option value={16}>Repetir por 16 semanas (Semestre)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {saving ? 'Agendando...' : 'Confirmar Reserva'}
                </button>
                <button
                  type="button"
                  className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs cursor-pointer"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vista Semanal en Columnas (Lunes a Sábado) */}
      {viewMode === 'semana' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CalendarDays className="size-4 text-cyan-400" />
              <span>Vista Semanal (Lunes a Sábado) — {eventosFiltrados.length} evento(s)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {diasSemana.map((dia) => {
              const eventosDelDia = eventosFiltrados.filter((e) => e.fecha === dia.fechaStr)
              const hoyStr = new Date().toISOString().slice(0, 10)
              const esHoy = dia.fechaStr === hoyStr

              return (
                <div
                  key={dia.fechaStr}
                  className={`card border rounded-xl p-3 flex flex-col justify-between space-y-2.5 transition-all ${
                    esHoy
                      ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  {/* Encabezado del Día */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <h4 className={`text-xs font-bold ${esHoy ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {dia.nombre}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400">
                        {dia.dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                    {esHoy && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-extrabold uppercase border border-cyan-500/40">
                        Hoy
                      </span>
                    )}
                  </div>

                  {/* Lista de Eventos Agendados en el Día */}
                  <div className="space-y-2 flex-1 min-h-[140px]">
                    {eventosDelDia.map((ev) => {
                      const lugarNom = lugaresMap.get(ev.lugar_id)?.nombre || 'Ubicación'
                      const now = new Date()
                      let isPast = false
                      if (ev.fecha) {
                        const [y, m, d] = ev.fecha.split('-').map(Number)
                        const [hFin, mFin] = (ev.hora_fin || '23:59').split(':').map(Number)
                        const evEndDate = new Date(y, m - 1, d, hFin, mFin, 0)
                        isPast = evEndDate < now
                      }

                      return (
                        <div
                          key={ev.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all relative group ${
                            isPast
                              ? 'bg-slate-950/40 border-slate-900 opacity-60'
                              : 'bg-slate-950 border-slate-800 hover:border-cyan-500/40'
                          }`}
                        >
                          {/* Horario y Botón Borrar */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-bold text-cyan-400">
                              {ev.hora_inicio} - {ev.hora_fin}
                            </span>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                              title="Dar de baja reserva"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {/* Lugar */}
                          <div className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-amber-300 truncate">
                              📍 {lugarNom}
                            </span>
                          </div>

                          {/* Título */}
                          <p className="font-bold text-slate-100 text-xs line-clamp-2">
                            {ev.titulo || 'Sin título'}
                          </p>

                          {/* Docente / Responsable */}
                          {ev.responsable && (
                            <p className="text-[10px] text-slate-400 truncate">
                              👤 {ev.responsable}
                            </p>
                          )}
                        </div>
                      )
                    })}

                    {eventosDelDia.length === 0 && (
                      <div className="h-full flex items-center justify-center text-center py-6">
                        <p className="text-[11px] text-slate-600 italic">Sin eventos</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Vista Día (Tabla / Detalle) */
        <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CalendarIcon className="size-4 text-cyan-400" />
              <span>Eventos del Día ({eventosFiltrados.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Lugar / Aula</th>
                  <th className="px-4 py-3">Título / Clase</th>
                  <th className="px-4 py-3">Docente / Responsable</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {eventosFiltrados.map((ev) => {
                  const lugarNom = lugaresMap.get(ev.lugar_id)?.nombre || 'Ubicación desconocida'

                  const now = new Date()
                  let isPast = false
                  if (ev.fecha) {
                    const [y, m, d] = ev.fecha.split('-').map(Number)
                    const [hFin, mFin] = (ev.hora_fin || '23:59').split(':').map(Number)
                    const evEndDate = new Date(y, m - 1, d, hFin, mFin, 0)
                    isPast = evEndDate < now
                  }

                  return (
                    <tr
                      key={ev.id}
                      className={`transition-colors ${
                        isPast
                          ? 'opacity-40 bg-slate-950/40 grayscale hover:opacity-75'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className={`px-4 py-3 font-mono font-semibold ${isPast ? 'text-slate-500 line-through' : 'text-cyan-400'}`}>
                        {ev.fecha}
                      </td>
                      <td className={`px-4 py-3 font-mono ${isPast ? 'text-slate-500' : 'text-slate-300'}`}>
                        {ev.hora_inicio} - {ev.hora_fin}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        <span className={`px-2 py-0.5 rounded border ${isPast ? 'bg-slate-950/80 border-slate-900 text-slate-500' : 'bg-slate-950 border-slate-800 text-amber-300 font-semibold'}`}>
                          📍 {lugarNom}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${isPast ? 'text-slate-400 font-normal' : 'text-slate-100'}`}>
                        {ev.titulo || 'Sin título'}
                        {isPast && <span className="ml-2 text-[10px] bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">Finalizado</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{ev.responsable || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded cursor-pointer transition-colors"
                          title="Dar de baja reserva"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {eventosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay eventos ni reservas agendadas para el día seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
