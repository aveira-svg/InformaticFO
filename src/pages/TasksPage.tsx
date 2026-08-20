import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../services/AuthContext'
import { listenProfiles } from '../services/profiles'
import { listenLugares } from '../services/lugares'
import {
  createTask,
  deleteTask,
  completeTask,
  addTaskUpdate,
  listenPendingTasks,
  listenCompletedTasks,
  listenTaskUpdates,
  listenAllTaskUpdates,
} from '../services/tasks'
import type { Profile, Lugar } from '../types/supabase'
import { Calendar, CheckCircle2, MessageSquare, Plus, Trash2, User, AlertTriangle, ClipboardList, MapPin } from 'lucide-react'

export default function TasksPage() {
  const { profile } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [pendingTasks, setPendingTasks] = useState<any[]>([])
  const [completedTasks, setCompletedTasks] = useState<any[]>([])
  const [allUpdates, setAllUpdates] = useState<{ id: string; task_id: string }[]>([])

  // Modal agregar tarea
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedLugarId, setSelectedLugarId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  // Modales de interacción
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [completionMsg, setCompletionMsg] = useState('')
  const [savingCompletion, setSavingCompletion] = useState(false)

  const [activeUpdatesTaskId, setActiveUpdatesTaskId] = useState<string | null>(null)
  const [newUpdateText, setNewUpdateText] = useState('')
  const [taskUpdates, setTaskUpdates] = useState<any[]>([])
  const [savingUpdate, setSavingUpdate] = useState(false)

  const [viewHistoryTask, setViewHistoryTask] = useState<any | null>(null)
  const [historyUpdates, setHistoryUpdates] = useState<any[]>([])

  useEffect(() => {
    const offProfiles = listenProfiles(setProfiles)
    const offLugares = listenLugares(setLugares)
    const offPending = listenPendingTasks(setPendingTasks)
    const offCompleted = listenCompletedTasks(setCompletedTasks)
    const offAllUpdates = listenAllTaskUpdates(setAllUpdates)
    return () => {
      offProfiles()
      offLugares()
      offPending()
      offCompleted()
      offAllUpdates()
    }
  }, [])

  useEffect(() => {
    if (!activeUpdatesTaskId) {
      setTaskUpdates([])
      return
    }
    const offUpdates = listenTaskUpdates(activeUpdatesTaskId, setTaskUpdates)
    return () => offUpdates()
  }, [activeUpdatesTaskId])

  useEffect(() => {
    if (!viewHistoryTask?.id) {
      setHistoryUpdates([])
      return
    }
    const offHistoryUpdates = listenTaskUpdates(viewHistoryTask.id, setHistoryUpdates)
    return () => offHistoryUpdates()
  }, [viewHistoryTask])

  const profilesMap = useMemo(() => {
    const m = new Map<string, Profile>()
    profiles.forEach((p) => m.set(p.id, p))
    return m
  }, [profiles])

  const lugaresMap = useMemo(() => {
    const m = new Map<string, Lugar>()
    lugares.forEach((l) => m.set(l.id, l))
    return m
  }, [lugares])

  const taskUpdatesCountMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const up of allUpdates) {
      m.set(up.task_id, (m.get(up.task_id) || 0) + 1)
    }
    return m
  }, [allUpdates])

  const esTareaVieja = (createdAtStr: string) => {
    const createdDate = new Date(createdAtStr)
    const diffTime = Math.abs(Date.now() - createdDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 3
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newDescription.trim() || !profile) return
    setCreating(true)
    try {
      await createTask(selectedLugarId || null, newDescription, selectedUsers, profile.id)
      setNewDescription('')
      setSelectedLugarId('')
      setSelectedUsers([])
      setShowAddForm(false)
    } catch (err) {
      console.error(err)
      alert('Error al crear la tarea')
    } finally {
      setCreating(false)
    }
  }

  async function handleAddUpdate(taskId: string) {
    if (!newUpdateText.trim() || !profile) return
    setSavingUpdate(true)
    try {
      await addTaskUpdate(taskId, newUpdateText, profile.id)
      setNewUpdateText('')
    } catch (err) {
      console.error(err)
      alert('Error al guardar actualización')
    } finally {
      setSavingUpdate(false)
    }
  }

  async function handleCompleteTask() {
    if (!completingTaskId || !profile) return
    setSavingCompletion(true)
    try {
      await completeTask(completingTaskId, completionMsg, profile.id)
      setCompletingTaskId(null)
      setCompletionMsg('')
    } catch (err) {
      console.error(err)
      alert('Error al completar la tarea')
    } finally {
      setSavingCompletion(false)
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('¿Estás seguro de eliminar esta tarea? Se dará de baja del sistema.')) return
    try {
      await deleteTask(taskId)
    } catch (err) {
      console.error(err)
      alert('Error al eliminar la tarea')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ClipboardList className="size-6 text-cyan-400" />
            <span>Tareas Pendientes & Mantenimiento</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de pendientes técnicos, asignaciones y registro de avances</p>
        </div>
        <button
          className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="size-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span>Tareas Activas</span>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full font-extrabold">
            {pendingTasks.length}
          </span>
        </h3>

        {pendingTasks.length === 0 ? (
          <div className="card bg-slate-900/90 border border-slate-800 p-8 text-center rounded-xl shadow-xl">
            <CheckCircle2 className="size-10 mx-auto text-emerald-400 mb-2 animate-bounce" />
            <p className="font-semibold text-slate-200 text-sm">¡Al día! No hay tareas pendientes</p>
            <p className="text-xs text-slate-500 mt-0.5">Todos los sistemas y equipos están operativos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTasks.map((task) => {
              const esVieja = esTareaVieja(task.created_at)
              const userNames = task.assignments?.map((a: any) => profilesMap.get(a.user_id)?.short_name || 'Desconocido') || []
              const lugarNombre = task.lugar?.nombre || lugaresMap.get(task.lugar_id)?.nombre || task.title || 'Ubicación General'
              const detalleText = task.subtitle || task.description
              const countUpdates = taskUpdatesCountMap.get(task.id) || 0

              return (
                <div
                  key={task.id}
                  className={`card bg-slate-900/90 border p-4 rounded-xl flex flex-col justify-between relative shadow-xl transition-all ${
                    esVieja
                      ? 'border-red-800/80 shadow-red-950/20'
                      : 'border-slate-800 hover:border-cyan-500/40 shadow-slate-950/50'
                  }`}
                >
                  {esVieja && (
                    <div className="absolute top-3 right-3 text-red-400 flex items-center gap-1 text-[10px] font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                      <AlertTriangle className="size-3" />
                      <span>&gt; 3 días</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-cyan-400" />
                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-100 font-bold text-sm text-cyan-300">
                      <MapPin className="size-4 text-cyan-400 shrink-0" />
                      <span className="truncate">{lugarNombre}</span>
                    </div>

                    {detalleText && (
                      <p className="text-slate-300 font-medium text-xs break-words leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        {detalleText}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-400">Asignado:</span>
                      {userNames.length === 0 ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-950 text-slate-500 rounded font-semibold border border-slate-800">
                          Sin asignar
                        </span>
                      ) : (
                        userNames.map((name: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 bg-slate-950 text-cyan-300 rounded-md font-medium border border-slate-800 inline-flex items-center gap-1"
                          >
                            <User className="size-2.5" />
                            {name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
                    <button
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 text-left cursor-pointer"
                      onClick={() => setActiveUpdatesTaskId(activeUpdatesTaskId === task.id ? null : task.id)}
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Comentarios / Avances ({countUpdates})</span>
                    </button>

                    {activeUpdatesTaskId === task.id && (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs mt-1 max-h-44 overflow-y-auto">
                        <div className="space-y-1.5">
                          {taskUpdates.map((up) => (
                            <div key={up.id} className="border-b border-slate-800/80 pb-1.5 last:border-b-0">
                              <div className="flex items-center justify-between text-[10px] text-cyan-400 font-semibold">
                                <span>{up.creator?.short_name || 'Sistema'}</span>
                                <span className="text-slate-500">
                                  {new Date(up.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-200 font-medium mt-0.5 break-words">{up.update_text}</p>
                            </div>
                          ))}
                          {taskUpdates.length === 0 && (
                            <p className="text-[10px] text-slate-500 text-center py-2">Sin avances registrados</p>
                          )}
                        </div>

                        <div className="flex gap-1.5 pt-1.5">
                          <input
                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500"
                            value={newUpdateText}
                            onChange={(e) => setNewUpdateText(e.target.value)}
                            placeholder="Agregar nota de avance..."
                          />
                          <button
                            disabled={savingUpdate || !newUpdateText.trim()}
                            className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-2.5 py-1 text-xs rounded cursor-pointer"
                            onClick={() => handleAddUpdate(task.id)}
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        className="btn bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs py-1.5 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer font-semibold"
                        onClick={() => setCompletingTaskId(task.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Completar</span>
                      </button>
                      <button
                        className="btn bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs py-1.5 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer font-semibold"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="size-3.5" />
                        <span>Dar de baja</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-sm font-bold text-slate-200 mb-3">Historial de Tareas Resueltas</h3>
        {completedTasks.length === 0 ? (
          <div className="card bg-slate-900/90 border border-slate-800 p-6 text-center text-slate-500 rounded-xl">
            No hay registros de tareas completadas.
          </div>
        ) : (
          <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Lugar / Título</th>
                    <th className="px-4 py-3">Detalle / Subtítulo</th>
                    <th className="px-4 py-3">Fecha Inicio</th>
                    <th className="px-4 py-3">Fecha Fin</th>
                    <th className="px-4 py-3">Asignados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {completedTasks.map((task) => {
                    const userNames = task.assignments?.map((a: any) => profilesMap.get(a.user_id)?.short_name || 'Desconocido') || []
                    const lugarNombre = task.lugar?.nombre || lugaresMap.get(task.lugar_id)?.nombre || task.title || 'Ubicación General'
                    const detalleText = task.subtitle || task.description
                    return (
                      <tr
                        key={task.id}
                        onClick={() => setViewHistoryTask(task)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-cyan-300 truncate max-w-xs">{lugarNombre}</td>
                        <td className="px-4 py-3 text-slate-200 truncate max-w-xs">{detalleText}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(task.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-emerald-400">
                          {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {userNames.map((name: string, i: number) => (
                              <span key={i} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                                {name}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-base">Registrar Nueva Tarea</h3>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setShowAddForm(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Lugar / Ubicación de la Tarea</label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none cursor-pointer"
                  value={selectedLugarId}
                  onChange={(e) => setSelectedLugarId(e.target.value)}
                >
                  <option value="">-- Seleccionar Lugar (Lista Total) --</option>
                  {lugares.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre} {!l.activo ? '(No visible)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Detalle / Subtítulo de Tarea <span className="text-red-400">*</span></label>
                <textarea
                  required
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 outline-none"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ej: Limpieza de ventiladores, reemplazar cable VGA, ajustar proyector..."
                  rows={3}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Asignar a Personal</label>
                <div className="max-h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded p-2 space-y-1.5">
                  {profiles.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, p.id])
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== p.id))
                          }
                        }}
                      />
                      <span>
                        {p.short_name} <strong className="text-cyan-400">({p.role})</strong>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {creating ? 'Guardando...' : 'Crear Tarea'}
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

      {completingTaskId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in space-y-4">
            <h3 className="font-bold text-slate-100 text-base border-b border-slate-800 pb-2">Completar Tarea</h3>
            <div className="space-y-4">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Mensaje de Resolución (Opcional)</label>
                <textarea
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  value={completionMsg}
                  onChange={(e) => setCompletionMsg(e.target.value)}
                  placeholder="Ej: Componente reemplazado exitosamente..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={savingCompletion}
                  className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
                  onClick={handleCompleteTask}
                >
                  Confirmar
                </button>
                <button
                  className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs cursor-pointer"
                  onClick={() => {
                    setCompletingTaskId(null)
                    setCompletionMsg('')
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Tarea */}
      {viewHistoryTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 max-h-[85dvh] overflow-y-auto shadow-2xl animate-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-cyan-400 text-base">Historial de Tarea Resuelta</h3>
              <button
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer"
                onClick={() => setViewHistoryTask(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 font-semibold">Lugar / Ubicación:</span>
                <p className="mt-1 p-2.5 bg-slate-950 rounded text-cyan-300 font-bold border border-slate-800 flex items-center gap-1.5">
                  <MapPin className="size-4 text-cyan-400" />
                  <span>{viewHistoryTask.lugar?.nombre || lugaresMap.get(viewHistoryTask.lugar_id)?.nombre || viewHistoryTask.title || 'Ubicación General'}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold">Detalle / Subtítulo:</span>
                <p className="mt-1 p-2.5 bg-slate-950 rounded text-slate-100 font-medium border border-slate-800">
                  {viewHistoryTask.subtitle || viewHistoryTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Creada el:</span>
                  <p className="font-medium text-slate-200">{new Date(viewHistoryTask.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Completada el:</span>
                  <p className="font-medium text-emerald-400">
                    {viewHistoryTask.completed_at ? new Date(viewHistoryTask.completed_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              {/* Registro de Actualizaciones / Avances */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <MessageSquare className="size-3.5 text-cyan-400" />
                    <span>Actualizaciones y Avances Registrados ({historyUpdates.length})</span>
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                  {historyUpdates.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-2">
                      No se registraron avances intermedios durante el desarrollo de esta tarea.
                    </p>
                  ) : (
                    historyUpdates.map((up) => (
                      <div key={up.id} className="border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-cyan-400 font-bold">{up.creator?.short_name || 'Personal'}</span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            {new Date(up.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs mt-0.5 break-words whitespace-pre-wrap">{up.update_text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold">Nota de Resolución / Cierre:</span>
                <p className="mt-1 p-2.5 bg-emerald-950/40 text-emerald-200 border border-emerald-800/60 rounded font-medium">
                  {viewHistoryTask.completion_message || 'Sin comentarios adicionales.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
