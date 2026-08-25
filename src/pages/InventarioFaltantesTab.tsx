import React, { useEffect, useMemo, useState } from 'react'
import {
  listenArticulosBorrador,
  getArticulosBorrador,
  createArticuloBorrador,
  updateArticuloBorrador,
  deleteArticuloBorrador,
  enviarPedido,
  listenPedidosEnviados,
  getPedidosEnviados,
  getPedidoDetalles,
} from '../services/inventarioFaltantes'
import {
  listenCategoriasFaltantes,
  createCategoriaFaltante,
  deleteCategoriaFaltante,
  DEFAULT_CATEGORIAS,
} from '../services/categoriasFaltantes'
import { useAuth } from '../services/AuthContext'
import type {
  ArticuloBorrador,
  PedidoEnviado,
  PedidoDetalle,
  CategoriaFaltante,
  PrioridadFaltante,
  MonedaFaltante,
} from '../types/supabase'
import {
  Plus, Trash2, Edit2, Send, FileText, ChevronDown, ChevronUp,
  Check, X, AlertTriangle, Clock, ShoppingCart, Package,
  Printer, History, Eye, BadgeCheck, Tag,
} from 'lucide-react'

const PRIORIDADES: PrioridadFaltante[] = ['Alta', 'Media', 'Baja']
const MONEDAS: MonedaFaltante[] = ['ARS', 'USD', 'EUR']

const PRIORIDAD_COLOR: Record<PrioridadFaltante, string> = {
  Alta: 'bg-red-500/10 text-red-300 border-red-500/30',
  Media: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Baja: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
}

const STATIC_CATEGORY_COLORS: Record<string, string> = {
  Laboratorio: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  Papelería: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  Computación: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  Limpieza: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  Otros: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
}

const PALETTE = [
  'bg-pink-500/10 text-pink-300 border-pink-500/30',
  'bg-amber-500/10 text-amber-300 border-amber-500/30',
  'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  'bg-orange-500/10 text-orange-300 border-orange-500/30',
  'bg-purple-500/10 text-purple-300 border-purple-500/30',
  'bg-rose-500/10 text-rose-300 border-rose-500/30',
  'bg-lime-500/10 text-lime-300 border-lime-500/30',
  'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
]

function getCategoriaColor(cat: string): string {
  if (STATIC_CATEGORY_COLORS[cat]) return STATIC_CATEGORY_COLORS[cat]
  let hash = 0
  for (let i = 0; i < cat.length; i++) hash = (hash << 5) - hash + cat.charCodeAt(i)
  const idx = Math.abs(hash) % PALETTE.length
  return PALETTE[idx]
}

function formatMoney(amount: number | null | undefined, moneda: string = 'ARS'): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(amount)
}

interface FormState {
  nombre: string; categoria: CategoriaFaltante; cantidad: string; prioridad: PrioridadFaltante
  justificacion: string; precio_estimado: string; moneda: MonedaFaltante; proveedor: string
}
const emptyForm = (): FormState => ({ nombre: '', categoria: 'Laboratorio', cantidad: '1', prioridad: 'Media', justificacion: '', precio_estimado: '', moneda: 'ARS', proveedor: '' })

export default function InventarioFaltantesTab() {
  const { user, profile } = useAuth()
  const [articulos, setArticulos] = useState<ArticuloBorrador[]>([])
  const [pedidos, setPedidos] = useState<PedidoEnviado[]>([])
  const [categorias, setCategorias] = useState<string[]>(DEFAULT_CATEGORIAS)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catError, setCatError] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showForm, setShowForm] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendingSolicitante, setSendingSolicitante] = useState('')
  const [sendingArea, setSendingArea] = useState('')
  const [sendingLoading, setSendingLoading] = useState(false)
  const [detailPedido, setDetailPedido] = useState<PedidoEnviado | null>(null)
  const [detailItems, setDetailItems] = useState<PedidoDetalle[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const off1 = listenArticulosBorrador(setArticulos)
    const off2 = listenPedidosEnviados(setPedidos)
    const off3 = listenCategoriasFaltantes(setCategorias)
    return () => {
      off1()
      off2()
      off3()
    }
  }, [])

  const handleCreateCategoria = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setCatError('')
    const trimmed = newCatName.trim()
    if (!trimmed) {
      setCatError('El nombre de la categoría es requerido')
      return
    }
    if (categorias.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCatError('Esta categoría ya existe')
      return
    }
    setCatSaving(true)
    try {
      const added = await createCategoriaFaltante(trimmed)
      setCategorias((prev) => Array.from(new Set([...prev, added])))
      setForm((prev) => ({ ...prev, categoria: added }))
      setNewCatName('')
      setShowCatModal(false)
    } catch (err: any) {
      setCatError(err?.message || 'Error al guardar la categoría')
    } finally {
      setCatSaving(false)
    }
  }

  const handleDeleteCategoria = async (cat: string) => {
    if (DEFAULT_CATEGORIAS.includes(cat)) {
      alert('Las categorías predeterminadas no se pueden eliminar')
      return
    }
    if (!confirm(`¿Eliminar la categoría "${cat}"?`)) return
    try {
      await deleteCategoriaFaltante(cat)
      setCategorias((prev) => prev.filter((c) => c !== cat))
      if (form.categoria === cat) {
        setForm((prev) => ({ ...prev, categoria: DEFAULT_CATEGORIAS[0] }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (profile?.short_name) setSendingSolicitante(profile.short_name)
  }, [profile])

  const totales = useMemo(() => {
    const totalArticulos = articulos.reduce((s, a) => s + a.cantidad, 0)
    const conPrecio = articulos.filter((a) => a.precio_estimado != null)
    const montoTotal = conPrecio.reduce((s, a) => s + (a.precio_estimado ?? 0) * a.cantidad, 0)
    const monedaPrincipal = articulos.find((a) => a.moneda)?.moneda ?? 'ARS'
    return { totalArticulos, montoTotal, monedaPrincipal, conPrecio: conPrecio.length }
  }, [articulos])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('')
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return }
    const cant = parseInt(form.cantidad)
    if (isNaN(cant) || cant < 1) { setFormError('La cantidad debe ser un número positivo'); return }
    if (!user) return
    setSaving(true)
    try {
      const created = await createArticuloBorrador(user.id, {
        nombre: form.nombre, categoria: form.categoria, cantidad: cant,
        prioridad: form.prioridad, justificacion: form.justificacion || undefined,
        precio_estimado: form.precio_estimado ? parseFloat(form.precio_estimado) : null,
        moneda: form.moneda, proveedor: form.proveedor || undefined,
      })

      // Actualizar inmediatamente estado local
      if (created) {
        setArticulos((prev) => [...prev, created])
      }
      getArticulosBorrador().then((fresh) => {
        if (fresh) setArticulos(fresh)
      })

      setForm(emptyForm())
    } catch (err: any) { setFormError(err?.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este artículo del borrador?')) return
    setArticulos((prev) => prev.filter((a) => a.id !== id))
    try {
      await deleteArticuloBorrador(id)
      getArticulosBorrador().then((fresh) => {
        if (fresh) setArticulos(fresh)
      })
    } catch (err) {
      console.error(err)
    }
  }

  const startEdit = (a: ArticuloBorrador) => {
    setEditingId(a.id)
    setEditForm({ nombre: a.nombre, categoria: a.categoria, cantidad: String(a.cantidad), prioridad: a.prioridad,
      justificacion: a.justificacion || '', precio_estimado: a.precio_estimado != null ? String(a.precio_estimado) : '',
      moneda: (a.moneda as MonedaFaltante) || 'ARS', proveedor: a.proveedor || '' })
  }

  const saveEdit = async (id: string) => {
    const cant = parseInt(editForm.cantidad)
    if (!editForm.nombre.trim() || isNaN(cant) || cant < 1) return
    const updateData = {
      nombre: editForm.nombre.trim(), categoria: editForm.categoria, cantidad: cant,
      prioridad: editForm.prioridad, justificacion: editForm.justificacion || undefined,
      precio_estimado: editForm.precio_estimado ? parseFloat(editForm.precio_estimado) : null,
      moneda: editForm.moneda, proveedor: editForm.proveedor || undefined
    }

    setArticulos((prev) => prev.map((a) => a.id === id ? { ...a, ...updateData } : a))
    setEditingId(null)

    try {
      await updateArticuloBorrador(id, updateData)
      getArticulosBorrador().then((fresh) => {
        if (fresh) setArticulos(fresh)
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handlePrint = (pedidoData?: { pedido: PedidoEnviado; items: PedidoDetalle[] }) => {
    const items = pedidoData ? pedidoData.items : articulos
    const sol = pedidoData ? pedidoData.pedido.solicitante : (profile?.short_name || '')
    const area = pedidoData ? (pedidoData.pedido.area || '') : ''
    const num = pedidoData ? '#' + pedidoData.pedido.numero_pedido : 'BORRADOR'
    const fecha = pedidoData ? new Date(pedidoData.pedido.fecha_envio).toLocaleString('es-AR') : new Date().toLocaleString('es-AR')
    const totalCant = items.reduce((s, a) => s + a.cantidad, 0)
    const conPrecio = items.filter((a) => a.precio_estimado != null)
    const monto = conPrecio.reduce((s, a) => s + (a.precio_estimado ?? 0) * a.cantidad, 0)
    const PC: Record<string, string> = { Alta: '#ef4444', Media: '#f59e0b', Baja: '#10b981' }
    const rows = items.map((a, i) => `<tr style="border-bottom:1px solid #e5e7eb;font-size:12px;">
      <td style="padding:8px 6px;text-align:center;color:#6b7280;">${i+1}</td>
      <td style="padding:8px 6px;font-weight:600;">${a.nombre}</td>
      <td style="padding:8px 6px;text-align:center;">${a.categoria}</td>
      <td style="padding:8px 6px;text-align:center;font-weight:700;color:${PC[a.prioridad]||'#374151'};">${a.prioridad}</td>
      <td style="padding:8px 6px;text-align:center;">${a.cantidad}</td>
      <td style="padding:8px 6px;text-align:right;">${a.precio_estimado!=null?`${a.moneda||'ARS'} ${a.precio_estimado.toFixed(2)}`:'—'}</td>
      <td style="padding:8px 6px;text-align:right;">${a.precio_estimado!=null?`${a.moneda||'ARS'} ${(a.precio_estimado*a.cantidad).toFixed(2)}`:'—'}</td>
      <td style="padding:8px 6px;color:#6b7280;font-size:11px;">${a.justificacion||'—'}</td>
      <td style="padding:8px 6px;color:#6b7280;font-size:11px;">${a.proveedor||'—'}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pedido ${num}</title>
    <style>body{font-family:Arial,sans-serif;color:#111;margin:0;padding:20px;}@page{margin:20mm;}
    table{width:100%;border-collapse:collapse;margin-top:16px;}
    th{background:#1e293b;color:#fff;padding:8px 6px;font-size:11px;text-align:left;}
    td{vertical-align:top;}.footer{margin-top:24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px;}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
      <div><h1 style="font-size:20px;margin:0 0 4px;">Solicitud de Compras</h1>
      <div style="font-size:13px;color:#374151;">Facultad de Odontología - UNNE — Sistema de Control de Stock</div></div>
      <div style="text-align:right;font-size:12px;color:#374151;">
        <div><strong>N Pedido:</strong> ${num}</div><div><strong>Fecha:</strong> ${fecha}</div>
        <div><strong>Solicitante:</strong> ${sol}</div>${area?`<div><strong>Area:</strong> ${area}</div>`:''}</div></div>
    <table><thead><tr>
      <th style="width:30px;">#</th><th>Articulo</th><th style="width:90px;">Categoria</th>
      <th style="width:65px;">Prioridad</th><th style="width:50px;">Cant.</th>
      <th style="width:100px;text-align:right;">P.Unit.</th><th style="width:110px;text-align:right;">Subtotal</th>
      <th>Justificacion</th><th>Proveedor</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer"><strong>Total: ${totalCant} unidades</strong>
    ${monto>0?` | <strong>Monto: ${formatMoney(monto, conPrecio[0]?.moneda||'ARS')}</strong>`:''}
    <br><span style="font-size:10px;">Precios estimados. Generado: ${new Date().toLocaleString('es-AR')}</span></div>
    </body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html); win.document.close(); win.focus()
    setTimeout(() => win.print(), 400)
  }

  const handleEnviar = async () => {
    if (!user || !sendingSolicitante.trim()) return
    setSendingLoading(true)
    try {
      const pedido = await enviarPedido(user.id, sendingSolicitante, sendingArea, articulos)
      if (pedido) {
        setPedidos((prev) => [pedido, ...prev])
      }
      setArticulos([])
      setShowSendModal(false)
      getArticulosBorrador().then((fresh) => { if (fresh) setArticulos(fresh) })
      getPedidosEnviados().then((fresh) => { if (fresh) setPedidos(fresh) })
    } catch (err: any) { alert('Error al enviar: ' + (err?.message || 'Error desconocido')) }
    finally { setSendingLoading(false) }
  }

  const handleVerDetalle = async (pedido: PedidoEnviado) => {
    setDetailPedido(pedido); setDetailLoading(true)
    const items = await getPedidoDetalles(pedido.id)
    setDetailItems(items); setDetailLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="size-6 text-violet-400" />
            <span>Inventario de Faltantes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de artículos pendientes de compra. Generá pedidos y consultá el historial de envíos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handlePrint()} disabled={articulos.length === 0}
            className="btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Printer className="size-4 text-violet-400" /> Generar Pedido
          </button>
          <button onClick={() => setShowSendModal(true)} disabled={articulos.length === 0}
            className="btn bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-2 px-3 rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-900/30 transition-all">
            <Send className="size-4" /> Marcar como Enviado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Artículos en borrador', value: articulos.length, color: 'text-slate-100' },
          { label: 'Unidades totales', value: totales.totalArticulos, color: 'text-violet-300' },
          { label: 'Monto estimado', value: totales.conPrecio > 0 ? formatMoney(totales.montoTotal, totales.monedaPrincipal) : '—', color: 'text-emerald-300', isText: true },
          { label: 'Pedidos enviados', value: pedidos.length, color: 'text-cyan-300' },
        ].map((card) => (
          <div key={card.label} className="card bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{card.label}</p>
            <p className={`${card.isText ? 'text-lg' : 'text-2xl'} font-bold mt-1 truncate ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <button className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer" onClick={() => setShowForm(v => !v)}>
          <span className="flex items-center gap-2 font-semibold text-sm text-slate-200"><Plus className="size-4 text-violet-400" />Agregar artículo al borrador</span>
          {showForm ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </button>
        {showForm && (
          <form onSubmit={handleAdd} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1 grid gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Nombre / Especificación <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 transition"
                placeholder="Ej: Resmas de papel A4..."
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">
                  Categoría <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCatModal(true)}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Agregar o gestionar categorías"
                >
                  <Plus className="size-3" /> Nueva / Gestionar
                </button>
              </div>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 transition cursor-pointer"
                value={form.categoria}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setShowCatModal(true)
                  } else {
                    setForm({ ...form, categoria: e.target.value })
                  }
                }}
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__NEW__" className="text-violet-400 font-semibold">
                  + Agregar nueva categoría...
                </option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Prioridad <span className="text-red-400">*</span></label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 transition cursor-pointer" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value as PrioridadFaltante })}>
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Cantidad solicitada <span className="text-red-400">*</span></label>
              <input type="number" min={1} required className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 transition" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Precio estimado unitario (opcional)</label>
              <div className="flex gap-1.5">
                <select className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 transition cursor-pointer" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value as MonedaFaltante })}>
                  {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="number" min={0} step="0.01" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 transition" placeholder="0.00" value={form.precio_estimado} onChange={(e) => setForm({ ...form, precio_estimado: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Proveedor / Enlace (opcional)</label>
              <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 transition" placeholder="Nombre del proveedor o URL..." value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 grid gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Justificación / Motivo (opcional)</label>
              <textarea rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 transition resize-none" placeholder="¿Por qué se solicita este artículo?" value={form.justificacion} onChange={(e) => setForm({ ...form, justificacion: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 flex-wrap">
              {formError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="size-3.5" />{formError}</p>}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => { setForm(emptyForm()); setFormError('') }} className="btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs py-2 px-3 rounded-lg cursor-pointer">Limpiar</button>
                <button type="submit" disabled={saving} className="btn bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-md shadow-violet-900/30 transition-all">
                  <Plus className="size-4" />{saving ? 'Guardando...' : 'Agregar al borrador'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <span className="flex items-center gap-2 font-semibold text-sm text-slate-200">
            <FileText className="size-4 text-violet-400" />Lista activa — Borrador
            {articulos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-violet-900/60 text-violet-300 rounded-full border border-violet-700/40">{articulos.length} ítem{articulos.length > 1 ? 's' : ''}</span>}
          </span>
        </div>
        {articulos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
            <Package className="size-10 opacity-30" />
            <p className="text-sm font-medium">El borrador está vacío</p>
            <p className="text-xs">Usá el formulario de arriba para agregar artículos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Artículo</th><th className="px-3 py-3">Categoría</th>
                    <th className="px-3 py-3">Prioridad</th><th className="px-3 py-3 text-center">Cant.</th>
                    <th className="px-3 py-3 text-right">Precio Unit.</th><th className="px-3 py-3 text-right">Subtotal</th>
                    <th className="px-3 py-3">Justificación</th><th className="px-3 py-3">Proveedor</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {articulos.map((a) => editingId === a.id ? (
                    <tr key={a.id} className="bg-slate-800/40">
                      <td className="px-3 py-2"><input className="w-full bg-slate-950 border border-violet-600 rounded px-2 py-1 text-xs text-slate-100 outline-none" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} /></td>
                      <td className="px-3 py-2">
                        <select
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 cursor-pointer outline-none"
                          value={editForm.categoria}
                          onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                              setShowCatModal(true)
                            } else {
                              setEditForm({ ...editForm, categoria: e.target.value })
                            }
                          }}
                        >
                          {categorias.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="__NEW__">+ Nueva categoría...</option>
                        </select>
                      </td>
                      <td className="px-3 py-2"><select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 cursor-pointer outline-none" value={editForm.prioridad} onChange={(e) => setEditForm({ ...editForm, prioridad: e.target.value as PrioridadFaltante })}>{PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}</select></td>
                      <td className="px-3 py-2 text-center"><input type="number" min={1} className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none text-center" value={editForm.cantidad} onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })} /></td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <select className="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-slate-100 cursor-pointer outline-none" value={editForm.moneda} onChange={(e) => setEditForm({ ...editForm, moneda: e.target.value as MonedaFaltante })}>{MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                          <input type="number" min={0} step="0.01" className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none text-right" value={editForm.precio_estimado} onChange={(e) => setEditForm({ ...editForm, precio_estimado: e.target.value })} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">—</td>
                      <td className="px-3 py-2"><input className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none" value={editForm.justificacion} onChange={(e) => setEditForm({ ...editForm, justificacion: e.target.value })} /></td>
                      <td className="px-3 py-2"><input className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none" value={editForm.proveedor} onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => saveEdit(a.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white cursor-pointer"><Check className="size-3.5" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 cursor-pointer"><X className="size-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-100">{a.nombre}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoriaColor(a.categoria)}`}>
                          {a.categoria}
                        </span>
                      </td>
                      <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORIDAD_COLOR[a.prioridad]}`}>{a.prioridad}</span></td>
                      <td className="px-3 py-3 text-center font-mono font-semibold text-slate-200">{a.cantidad}</td>
                      <td className="px-3 py-3 text-right text-slate-400 font-mono">{a.precio_estimado != null ? `${a.moneda} ${a.precio_estimado.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-300">{a.precio_estimado != null ? formatMoney(a.precio_estimado * a.cantidad, a.moneda) : '—'}</td>
                      <td className="px-3 py-3 text-slate-400 max-w-[160px] truncate" title={a.justificacion}>{a.justificacion || '—'}</td>
                      <td className="px-3 py-3 text-slate-400 max-w-[120px] truncate" title={a.proveedor}>{a.proveedor || '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(a)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-violet-300 cursor-pointer"><Edit2 className="size-3.5" /></button>
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 cursor-pointer"><Trash2 className="size-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-800 bg-slate-950/60 px-5 py-3 flex flex-wrap justify-between items-center gap-4 text-xs">
              <div className="text-slate-400">
                <span className="font-semibold text-slate-300">{articulos.length}</span> tipo{articulos.length > 1 ? 's' : ''} · <span className="font-semibold text-violet-300">{totales.totalArticulos}</span> unidades
              </div>
              {totales.conPrecio > 0 && (
                <div className="font-semibold text-emerald-300">
                  Presupuesto: {formatMoney(totales.montoTotal, totales.monedaPrincipal)}<span className="text-slate-500 font-normal ml-1">({totales.conPrecio}/{articulos.length} con precio)</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-800">
          <History className="size-4 text-cyan-400" />
          <span className="font-semibold text-sm text-slate-200">Historial de Pedidos Enviados</span>
          {pedidos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-cyan-900/50 text-cyan-300 rounded-full border border-cyan-700/40 ml-auto">{pedidos.length} pedido{pedidos.length > 1 ? 's' : ''}</span>}
        </div>
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
            <BadgeCheck className="size-10 opacity-30" />
            <p className="text-sm font-medium">Aún no hay pedidos enviados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ID Pedido</th><th className="px-4 py-3">Fecha y Hora de Envío</th>
                  <th className="px-4 py-3">Solicitante</th><th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3 text-center">Artículos</th><th className="px-4 py-3 text-right">Monto Est.</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-violet-300 font-bold">#{p.numero_pedido}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{new Date(p.fecha_envio).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{p.solicitante}</td>
                    <td className="px-4 py-3 text-slate-400">{p.area || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold">{p.total_articulos}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-300">{p.monto_estimado != null ? formatMoney(p.monto_estimado, p.moneda) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleVerDetalle(p)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 cursor-pointer transition-colors" title="Ver detalle"><Eye className="size-4" /></button>
                        <button onClick={async () => { const items = await getPedidoDetalles(p.id); handlePrint({ pedido: p, items }) }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-violet-300 cursor-pointer transition-colors" title="Re-imprimir"><Printer className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Gestión de Categorías */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Tag className="size-5 text-violet-400" />
                <span>Gestionar Categorías</span>
              </h3>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            {/* Crear nueva categoría */}
            <form onSubmit={handleCreateCategoria} className="space-y-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Nueva Categoría</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mobiliario, Ferretería, Audio..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 transition"
                    value={newCatName}
                    onChange={(e) => { setNewCatName(e.target.value); setCatError('') }}
                  />
                  <button
                    type="submit"
                    disabled={catSaving || !newCatName.trim()}
                    className="btn bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2 px-3 rounded-lg inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Plus className="size-4" />
                    <span>{catSaving ? 'Guardando...' : 'Agregar'}</span>
                  </button>
                </div>
                {catError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="size-3.5" />{catError}</p>}
              </div>
            </form>

            {/* Lista de categorías disponibles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400">Categorías Registradas ({categorias.length})</h4>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {categorias.map((cat) => {
                  const isDefault = DEFAULT_CATEGORIAS.includes(cat)
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <span className={`px-2 py-0.5 rounded-full font-semibold border text-[11px] ${getCategoriaColor(cat)}`}>
                        {cat}
                      </span>
                      {isDefault ? (
                        <span className="text-[10px] text-slate-500 italic">Predeterminada</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategoria(cat)}
                          className="p-1 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                          title="Eliminar categoría personalizada"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="w-full btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs py-2 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2"><Send className="size-5 text-violet-400" />Confirmar Envío de Pedido</h3>
              <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="size-5" /></button>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>Esta acción registrará el envío y <strong>limpiará el borrador activo</strong>. Los {articulos.length} artículos quedarán guardados en el historial.</span>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Solicitante <span className="text-red-400">*</span></label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 transition" placeholder="Nombre del solicitante..." value={sendingSolicitante} onChange={(e) => setSendingSolicitante(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Área (opcional)</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 transition" placeholder="Ej: Laboratorio de Anatomía..." value={sendingArea} onChange={(e) => setSendingArea(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowSendModal(false)} className="flex-1 btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs py-2.5 rounded-xl cursor-pointer">Cancelar</button>
              <button onClick={handleEnviar} disabled={sendingLoading || !sendingSolicitante.trim()} className="flex-1 btn bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-violet-900/30 transition-all">
                {sendingLoading ? <><Clock className="size-4 animate-spin" />Enviando...</> : <><Send className="size-4" />Confirmar Envío</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailPedido && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl card bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2"><FileText className="size-5 text-violet-400" />Pedido <span className="text-violet-300">#{detailPedido.numero_pedido}</span></h3>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(detailPedido.fecha_envio).toLocaleString('es-AR')} · {detailPedido.solicitante}{detailPedido.area ? ` · ${detailPedido.area}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint({ pedido: detailPedido, items: detailItems })} className="btn bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"><Printer className="size-3.5 text-violet-400" />Re-imprimir</button>
                <button onClick={() => setDetailPedido(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="size-5" /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm"><Clock className="size-5 animate-spin" />Cargando detalles...</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">#</th><th className="px-4 py-3">Artículo</th><th className="px-3 py-3">Categoría</th>
                      <th className="px-3 py-3">Prioridad</th><th className="px-3 py-3 text-center">Cant.</th>
                      <th className="px-3 py-3 text-right">Precio Unit.</th><th className="px-3 py-3 text-right">Subtotal</th>
                      <th className="px-3 py-3">Justificación</th><th className="px-3 py-3">Proveedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {detailItems.map((d, i) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-100">{d.nombre}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoriaColor(
                              d.categoria
                            )}`}
                          >
                            {d.categoria}
                          </span>
                        </td>
                        <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORIDAD_COLOR[d.prioridad]}`}>{d.prioridad}</span></td>
                        <td className="px-3 py-3 text-center font-mono font-semibold">{d.cantidad}</td>
                        <td className="px-3 py-3 text-right font-mono text-slate-400">{d.precio_estimado != null ? `${d.moneda} ${d.precio_estimado.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-300">{d.precio_estimado != null ? formatMoney(d.precio_estimado * d.cantidad, d.moneda) : '—'}</td>
                        <td className="px-3 py-3 text-slate-400 max-w-[140px] truncate" title={d.justificacion}>{d.justificacion || '—'}</td>
                        <td className="px-3 py-3 text-slate-400 max-w-[120px] truncate" title={d.proveedor}>{d.proveedor || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!detailLoading && detailItems.length > 0 && (
              <div className="border-t border-slate-800 bg-slate-950/60 px-5 py-3 flex flex-wrap justify-between items-center gap-4 text-xs shrink-0">
                <div className="text-slate-400"><span className="font-semibold text-slate-300">{detailItems.length}</span> tipo{detailItems.length > 1 ? 's' : ''} · <span className="font-semibold text-violet-300">{detailPedido.total_articulos}</span> unidades</div>
                {detailPedido.monto_estimado != null && <div className="font-semibold text-emerald-300">Total: {formatMoney(detailPedido.monto_estimado, detailPedido.moneda)}</div>}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
