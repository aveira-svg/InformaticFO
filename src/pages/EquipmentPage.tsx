import React, { useEffect, useMemo, useState } from 'react'
import {
  listenResguardos,
  createResguardo,
  updateResguardo,
  deleteResguardo,
  ensureUniqueResguardoCodigo,
  getResguardoHistory,
} from '../services/resguardos'
import { listenTiposEquipo } from '../services/tiposEquipo'
import { listenProfiles } from '../services/profiles'
import { listenLugares } from '../services/lugares'
import type { Resguardo, TipoEquipoDoc, EstadoResguardo, Profile, Lugar } from '../types/supabase'
import { Search, Plus, Download, History, Trash2, Edit2, ShieldCheck, UserCheck, MapPin, ShoppingCart } from 'lucide-react'
import InventarioFaltantesTab from './InventarioFaltantesTab'

export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<'bienes' | 'faltantes'>('bienes')
  const [resguardos, setResguardos] = useState<Resguardo[]>([])
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoDoc[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  // Modales
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingResguardo, setEditingResguardo] = useState<Resguardo | null>(null)
  const [historyResguardo, setHistoryResguardo] = useState<{ resguardo: Resguardo; logs: any[] } | null>(null)

  // Formulario agregar / editar
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [areaODestino, setAreaODestino] = useState('')
  const [personalACargo, setPersonalACargo] = useState('')
  const [estado, setEstado] = useState<EstadoResguardo>('asignado')
  const [observaciones, setObservaciones] = useState('')

  const [checkingCode, setCheckingCode] = useState(false)
  const [isCodeUnique, setIsCodeUnique] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const off1 = listenResguardos(setResguardos)
    const off2 = listenTiposEquipo(setTiposEquipo)
    const off3 = listenProfiles(setProfiles)
    const off4 = listenLugares(setLugares)
    return () => {
      off1()
      off2()
      off3()
      off4()
    }
  }, [])

  // Comprobar código único en alta
  useEffect(() => {
    let active = true
    async function check() {
      const code = codigo.trim().toUpperCase()
      if (!code || editingResguardo) {
        setIsCodeUnique(null)
        return
      }
      setCheckingCode(true)
      const ok = await ensureUniqueResguardoCodigo(code)
      if (active) setIsCodeUnique(ok)
      setCheckingCode(false)
    }
    check()
    return () => {
      active = false
    }
  }, [codigo, editingResguardo])

  // Filtrar resguardos contemplando todas las columnas registradas (incluyendo observaciones y detalles)
  const resguardosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    return resguardos.filter((r) => {
      const matchSearch =
        !q ||
        r.codigo_unico.toLowerCase().includes(q) ||
        r.nombre.toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q) ||
        r.marca?.toLowerCase().includes(q) ||
        r.modelo?.toLowerCase().includes(q) ||
        r.numero_serie?.toLowerCase().includes(q) ||
        r.area_o_destino?.toLowerCase().includes(q) ||
        r.personal_a_cargo?.toLowerCase().includes(q) ||
        r.estado.toLowerCase().includes(q) ||
        r.observaciones?.toLowerCase().includes(q)

      const matchTipo = !filterTipo || r.tipo === filterTipo
      const matchEstado = !filterEstado || r.estado === filterEstado

      return matchSearch && matchTipo && matchEstado
    })
  }, [resguardos, search, filterTipo, filterEstado])

  // Guardar nuevo resguardo
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim() || !nombre.trim() || isCodeUnique === false) return
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      await createResguardo(id, {
        codigo_unico: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        tipo: tipo || (tiposEquipo[0]?.id ?? 'General'),
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        numero_serie: numeroSerie.trim() || undefined,
        area_o_destino: areaODestino.trim() || undefined,
        personal_a_cargo: personalACargo.trim() || undefined,
        estado,
        observaciones: observaciones.trim() || undefined,
      })
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el resguardo. Recuerda crear la tabla "resguardos" en Supabase si aún no existe.')
    } finally {
      setSaving(false)
    }
  }

  // Actualizar resguardo
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingResguardo) return
    setSaving(true)
    try {
      await updateResguardo(editingResguardo.id, {
        nombre: nombre.trim(),
        tipo,
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        numero_serie: numeroSerie.trim() || undefined,
        area_o_destino: areaODestino.trim() || undefined,
        personal_a_cargo: personalACargo.trim() || undefined,
        estado,
        observaciones: observaciones.trim() || undefined,
      })
      setEditingResguardo(null)
      resetForm()
    } catch (err) {
      console.error(err)
      alert('Error al actualizar el resguardo')
    } finally {
      setSaving(false)
    }
  }

  // Soft delete
  async function handleDelete(r: Resguardo) {
    if (!confirm(`¿Dar de baja lógica al resguardo ${r.codigo_unico} — ${r.nombre}?`)) return
    try {
      await deleteResguardo(r.id)
    } catch (err) {
      console.error(err)
      alert('Error al dar de baja el resguardo')
    }
  }

  // Ver historial de trazabilidad
  async function handleViewHistory(r: Resguardo) {
    const logs = await getResguardoHistory(r.id)
    setHistoryResguardo({ resguardo: r, logs })
  }

  function resetForm() {
    setCodigo('')
    setNombre('')
    setTipo(tiposEquipo[0]?.id || '')
    setMarca('')
    setModelo('')
    setNumeroSerie('')
    setAreaODestino('')
    setPersonalACargo('')
    setEstado('asignado')
    setObservaciones('')
    setIsCodeUnique(null)
  }

  // Exportar a CSV
  function exportCSV() {
    const headers = ['ID', 'Codigo Unico', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Numero Serie', 'Area / Destino', 'Personal a Cargo', 'Estado', 'Observaciones']
    const rows = resguardosFiltrados.map((r) => [
      r.id,
      r.codigo_unico,
      `"${r.nombre.replace(/"/g, '""')}"`,
      r.tipo,
      r.marca || '',
      r.modelo || '',
      r.numero_serie || '',
      `"${(r.area_o_destino || '').replace(/"/g, '""')}"`,
      `"${(r.personal_a_cargo || '').replace(/"/g, '""')}"`,
      r.estado,
      `"${(r.observaciones || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `resguardos_inventario_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('bienes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'bienes'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="size-4" />
          Bienes e Inventario
        </button>
        <button
          onClick={() => setActiveTab('faltantes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'faltantes'
              ? 'border-violet-400 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="size-4" />
          Inventario de Faltantes
        </button>
      </div>

      {activeTab === 'faltantes' ? (
        <InventarioFaltantesTab />
      ) : (
        <>
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="size-6 text-cyan-400" />
                <span>Gestión de Bienes</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Control de inventario permanente, asignaciones por área/personal y trazabilidad</p>
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
                <span>Nuevo Resguardo</span>
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
            placeholder="Buscar por código, nombre, marca, serie, observaciones, etc..."
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
            <option value="asignado">Asignado</option>
            <option value="disponible">Disponible</option>
            <option value="en_reparacion">En Reparación</option>
            <option value="de_baja">De Baja</option>
          </select>
        </div>
      </div>

      {/* Tabla de Resguardos */}
      <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Código Único</th>
                <th className="px-4 py-3">Bien / Descripción</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Área / Destino</th>
                <th className="px-4 py-3">Personal a Cargo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {resguardosFiltrados.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-cyan-400">{r.codigo_unico}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">
                    <div>{r.nombre}</div>
                    {(r.marca || r.modelo) && (
                      <div className="text-[11px] text-slate-400 font-normal">
                        {r.marca || ''} {r.modelo ? `(${r.modelo})` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    {r.area_o_destino ? (
                      <span className="inline-flex items-center gap-1 text-slate-200 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/40">
                        <MapPin className="size-3 text-amber-400" />
                        {r.area_o_destino}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    {r.personal_a_cargo ? (
                      <span className="inline-flex items-center gap-1 text-slate-200 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
                        <UserCheck className="size-3 text-cyan-400" />
                        {r.personal_a_cargo}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        r.estado === 'asignado'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : r.estado === 'disponible'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.estado === 'en_reparacion'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {r.estado === 'en_reparacion' ? 'en reparación' : r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleViewHistory(r)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded cursor-pointer"
                      title="Ver Trazabilidad / Historial"
                    >
                      <History className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingResguardo(r)
                        setNombre(r.nombre)
                        setTipo(r.tipo)
                        setMarca(r.marca || '')
                        setModelo(r.modelo || '')
                        setNumeroSerie(r.numero_serie || '')
                        setAreaODestino(r.area_o_destino || '')
                        setPersonalACargo(r.personal_a_cargo || '')
                        setEstado(r.estado)
                        setObservaciones(r.observaciones || '')
                      }}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded cursor-pointer"
                      title="Editar Resguardo"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                      title="Dar de Baja Lógica"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {resguardosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron resguardos en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar Resguardo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <h3 className="font-bold text-slate-100 text-base mb-4 border-b border-slate-800 pb-2">Registrar Nuevo Resguardo</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Código Único (Identificador)</label>
                <input
                  required
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-500"
                  placeholder="RESG-001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                {checkingCode && <span className="text-[10px] text-slate-400">Verificando disponibilidad...</span>}
                {isCodeUnique === false && <span className="text-[10px] text-red-400">Código ya en uso</span>}
                {isCodeUnique === true && <span className="text-[10px] text-emerald-400">Código disponible</span>}
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Nombre del Bien / Descripción</label>
                <input
                  required
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Impresora HP LaserJet Pro"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Tipo / Categoría</label>
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
                    placeholder="HP"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-slate-300">Modelo</label>
                  <input
                    type="text"
                    className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                    placeholder="M404dn"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Área / Destino de Asignación</label>
                <div className="space-y-1">
                  {lugares.length > 0 && (
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none mb-1"
                      value={lugares.some((l) => l.nombre === areaODestino) ? areaODestino : ''}
                      onChange={(e) => {
                        if (e.target.value) setAreaODestino(e.target.value)
                      }}
                    >
                      <option value="">-- Seleccionar de lugares registrados --</option>
                      {lugares.map((l) => (
                        <option key={l.id} value={l.nombre}>
                          {l.nombre} {!l.activo ? '(No visible)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none placeholder-slate-500 focus:border-cyan-500"
                    placeholder="Secretaría Académica, Laboratorio 2..."
                    value={areaODestino}
                    onChange={(e) => setAreaODestino(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Personal a Cargo</label>
                <div className="space-y-1">
                  {profiles.length > 0 && (
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none mb-1"
                      value={profiles.some((p) => p.short_name === personalACargo) ? personalACargo : ''}
                      onChange={(e) => {
                        if (e.target.value) setPersonalACargo(e.target.value)
                      }}
                    >
                      <option value="">-- Seleccionar de usuarios --</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.short_name}>
                          {p.short_name} ({p.email})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none placeholder-slate-500 focus:border-cyan-500"
                    placeholder="Escriba o personalice el nombre..."
                    value={personalACargo}
                    onChange={(e) => setPersonalACargo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Estado del Resguardo</label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoResguardo)}
                >
                  <option value="asignado">Asignado</option>
                  <option value="disponible">Disponible</option>
                  <option value="en_reparacion">En Reparación</option>
                  <option value="de_baja">De Baja</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || isCodeUnique === false}
                  className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {saving ? 'Guardando...' : 'Guardar Resguardo'}
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

      {/* Modal Editar Resguardo */}
      {editingResguardo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in">
            <h3 className="font-bold text-slate-100 text-base mb-4 border-b border-slate-800 pb-2">
              Editar Resguardo ({editingResguardo.codigo_unico})
            </h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Nombre / Bien</label>
                <input
                  required
                  type="text"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Tipo de Bien</label>
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
                <label className="text-xs font-semibold text-slate-300">Área / Destino</label>
                <div className="space-y-1">
                  {lugares.length > 0 && (
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none mb-1"
                      value={lugares.some((l) => l.nombre === areaODestino) ? areaODestino : ''}
                      onChange={(e) => {
                        if (e.target.value) setAreaODestino(e.target.value)
                      }}
                    >
                      <option value="">-- Seleccionar de lugares registrados --</option>
                      {lugares.map((l) => (
                        <option key={l.id} value={l.nombre}>
                          {l.nombre} {!l.activo ? '(No visible)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none"
                    value={areaODestino}
                    onChange={(e) => setAreaODestino(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Personal a Cargo</label>
                <div className="space-y-1">
                  {profiles.length > 0 && (
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none mb-1"
                      value={profiles.some((p) => p.short_name === personalACargo) ? personalACargo : ''}
                      onChange={(e) => {
                        if (e.target.value) setPersonalACargo(e.target.value)
                      }}
                    >
                      <option value="">-- Seleccionar de usuarios --</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.short_name}>
                          {p.short_name} ({p.email})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 outline-none placeholder-slate-500 focus:border-cyan-500"
                    placeholder="Escriba o personalice el nombre..."
                    value={personalACargo}
                    onChange={(e) => setPersonalACargo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-semibold text-slate-300">Estado</label>
                <select
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoResguardo)}
                >
                  <option value="asignado">Asignado</option>
                  <option value="disponible">Disponible</option>
                  <option value="en_reparacion">En Reparación</option>
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
                  onClick={() => setEditingResguardo(null)}
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
      {historyResguardo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 max-h-[85dvh] overflow-y-auto shadow-2xl animate-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <div>
                <h3 className="font-bold text-cyan-400 text-base">Historial de Trazabilidad</h3>
                <p className="text-xs text-slate-400">
                  {historyResguardo.resguardo.codigo_unico} — {historyResguardo.resguardo.nombre}
                </p>
              </div>
              <button
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer"
                onClick={() => setHistoryResguardo(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              {historyResguardo.logs.map((log) => (
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

              {historyResguardo.logs.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No hay registros de trazabilidad previos</p>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
