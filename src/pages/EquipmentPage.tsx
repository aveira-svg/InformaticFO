import React, { useEffect, useMemo, useState } from 'react'
import {
  listenEquipos,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  ensureUniqueCodigo,
  getEquipmentHistory,
} from '../services/equipos'
import { listenTiposEquipo } from '../services/tiposEquipo'
import type { Equipo, TipoEquipoDoc, EstadoEquipo } from '../types/supabase'
import { Search, Plus, Download, History, Trash2, Edit2, Monitor } from 'lucide-react'

export default function EquipmentPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoDoc[]>([])
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  // Modales
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null)
  const [historyEquipo, setHistoryEquipo] = useState<{ equipo: Equipo; logs: any[] } | null>(null)

  // Formulario agregar / editar
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [estado, setEstado] = useState<EstadoEquipo>('disponible')
  const [estadoOtro, setEstadoOtro] = useState('')

  const [checkingCode, setCheckingCode] = useState(false)
  const [isCodeUnique, setIsCodeUnique] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const off1 = listenEquipos(setEquipos)
    const off2 = listenTiposEquipo(setTiposEquipo)
    return () => {
      off1()
      off2()
    }
  }, [])

  // Comprobar código único en alta
  useEffect(() => {
    let active = true
    async function check() {
      const code = codigo.trim().toUpperCase()
      if (!code || editingEquipo) {
        setIsCodeUnique(null)
        return
      }
      setCheckingCode(true)
      const ok = await ensureUniqueCodigo(code)
      if (active) setIsCodeUnique(ok)
      setCheckingCode(false)
    }
    check()
    return () => {
      active = false
    }
  }, [codigo, editingEquipo])

  // Filtrar equipos
  const equiposFiltrados = useMemo(() => {
    return equipos.filter((eq) => {
      const matchSearch =
        !search ||
        eq.codigo_unico.toLowerCase().includes(search.toLowerCase()) ||
        eq.nombre.toLowerCase().includes(search.toLowerCase()) ||
        eq.marca?.toLowerCase().includes(search.toLowerCase()) ||
        eq.modelo?.toLowerCase().includes(search.toLowerCase())

      const matchTipo = !filterTipo || eq.tipo === filterTipo
      const matchEstado = !filterEstado || eq.estado === filterEstado

      return matchSearch && matchTipo && matchEstado
    })
  }, [equipos, search, filterTipo, filterEstado])

  // Guardar nuevo equipo
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim() || !nombre.trim() || isCodeUnique === false) return
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      await createEquipo(id, {
        codigo_unico: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        tipo: tipo || (tiposEquipo[0]?.id ?? 'General'),
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        numero_serie: numeroSerie.trim() || undefined,
        estado,
        estado_otro: estado === 'de_baja' ? (estadoOtro.trim() || undefined) : undefined,
        ubicacion_actual: '',
      })
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el equipo')
    } finally {
      setSaving(false)
    }
  }

  // Actualizar equipo
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingEquipo) return
    setSaving(true)
    try {
      await updateEquipo(editingEquipo.id, {
        nombre: nombre.trim(),
        tipo,
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        numero_serie: numeroSerie.trim() || undefined,
        estado,
        estado_otro: estado_otro_clean(estadoOtro),
      })
      setEditingEquipo(null)
      resetForm()
    } catch (err) {
      console.error(err)
      alert('Error al actualizar el equipo')
    } finally {
      setSaving(false)
    }
  }

  function estado_otro_clean(val: string) {
    return val ? val.trim() : undefined
  }

  // Soft delete
  async function handleDelete(eq: Equipo) {
    if (!confirm(`¿Dar de baja lógica al equipo ${eq.codigo_unico} — ${eq.nombre}?`)) return
    try {
      await deleteEquipo(eq.id)
    } catch (err) {
      console.error(err)
      alert('Error al dar de baja el equipo')
    }
  }

  // Ver historial de trazabilidad
  async function handleViewHistory(eq: Equipo) {
    const logs = await getEquipmentHistory(eq.id)
    setHistoryEquipo({ equipo: eq, logs })
  }

  function resetForm() {
    setCodigo('')
    setNombre('')
    setTipo(tiposEquipo[0]?.id || '')
    setMarca('')
    setModelo('')
    setNumeroSerie('')
    setEstado('disponible')
    setEstadoOtro('')
    setIsCodeUnique(null)
  }

  // Exportar a CSV
  function exportCSV() {
    const headers = ['ID', 'Codigo Unico', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Numero Serie', 'Estado']
    const rows = equiposFiltrados.map((e) => [
      e.id,
      e.codigo_unico,
      `"${e.nombre.replace(/"/g, '""')}"`,
      e.tipo,
      e.marca || '',
      e.modelo || '',
      e.numero_serie || '',
      e.estado,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `equipos_inventario_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Monitor className="size-6 text-cyan-400" />
            <span>Gestión de Equipos e Infraestructura</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Control de catálogo informático, trazabilidad y estado físico</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs py-2 px-3 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="size-4 text-cyan-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs py-2 px-3 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Plus className="size-4" />
            <span>Nuevo Equipo</span>
          </button>
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <div className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="size-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
            placeholder="Buscar por código, nombre, marca o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="">Todos los Tipos</option>
            {tiposEquipo.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>

          <select
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="disponible">Disponible</option>
            <option value="en_uso">En Uso</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="de_baja">De Baja</option>
          </select>
        </div>
      </div>

      {/* Tabla de Equipos (PC) & Lista (Móvil) */}
      <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Código Único</th>
                <th className="px-4 py-3">Nombre / Descripción</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca / Modelo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {equiposFiltrados.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-cyan-400">{eq.codigo_unico}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{eq.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                      {eq.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {eq.marca || '—'} {eq.modelo ? `(${eq.modelo})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        eq.estado === 'disponible'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : eq.estado === 'en_uso'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : eq.estado === 'mantenimiento'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {eq.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleViewHistory(eq)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded cursor-pointer"
                      title="Ver Trazabilidad / Historial"
                    >
                      <History className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingEquipo(eq)
                        setNombre(eq.nombre)
                        setTipo(eq.tipo)
                        setMarca(eq.marca || '')
                        setModelo(eq.modelo || '')
                        setNumeroSerie(eq.numero_serie || '')
                        setEstado(eq.estado)
                        setEstadoOtro(eq.estado_otro || '')
                      }}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded cursor-pointer"
                      title="Editar Equipo"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(eq)}
                      className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                      title="Dar de Baja Lógica"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {equiposFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron equipos en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar Equipo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <h3 className="font-bold text-slate-100 text-base mb-4 border-b border-slate-800 pb-2">Registrar Nuevo Equipo</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Código Único (Identificador)</label>
                <input
                  required
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-500"
                  placeholder="PROY001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                {checkingCode && <span className="text-[10px] text-slate-400">Verificando disponibilidad...</span>}
                {isCodeUnique === false && <span className="text-[10px] text-red-400">Código ya en uso</span>}
                {isCodeUnique === true && <span className="text-[10px] text-emerald-400">Código disponible</span>}
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Nombre / Marca</label>
                <input
                  required
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Proyector Epson EB-S41"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Tipo de Equipo</label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {tiposEquipo.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-slate-300">Marca</label>
                  <input
                    type="text"
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                    placeholder="Epson"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-slate-300">Modelo</label>
                  <input
                    type="text"
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                    placeholder="EB-S41"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Número de Serie (Opcional)</label>
                <input
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                  placeholder="SN-99882311"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || isCodeUnique === false}
                  className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {saving ? 'Guardando...' : 'Guardar Equipo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Equipo */}
      {editingEquipo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <h3 className="font-bold text-slate-100 text-base mb-4 border-b border-slate-800 pb-2">
              Editar Equipo ({editingEquipo.codigo_unico})
            </h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Nombre / Marca</label>
                <input
                  required
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Tipo de Equipo</label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {tiposEquipo.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Estado del Equipo</label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoEquipo)}
                >
                  <option value="disponible">Disponible</option>
                  <option value="en_uso">En Uso</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="de_baja">De Baja</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {saving ? 'Guardando...' : 'Actualizar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEquipo(null)}
                  className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Trazabilidad */}
      {historyEquipo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 max-h-[85dvh] overflow-y-auto shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <div>
                <h3 className="font-bold text-cyan-400 text-base">Historial de Trazabilidad</h3>
                <p className="text-xs text-slate-400">
                  {historyEquipo.equipo.codigo_unico} — {historyEquipo.equipo.nombre}
                </p>
              </div>
              <button
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer"
                onClick={() => setHistoryEquipo(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              {historyEquipo.logs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-300">
                    <span className="uppercase text-cyan-400">{log.action_type}</span>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  {log.details && <p className="text-slate-400 mt-1">{log.details}</p>}
                  {log.user?.short_name && (
                    <p className="text-[10px] text-slate-500">Por: {log.user.short_name}</p>
                  )}
                </div>
              ))}

              {historyEquipo.logs.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No hay registros de movimientos previas</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
