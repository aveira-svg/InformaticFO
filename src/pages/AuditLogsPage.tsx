import React, { useEffect, useState } from 'react'
import { queryAuditLogs, listenRecentLogs } from '../services/auditLogs'
import type { AuditLog } from '../types/supabase'
import { FileText, Search, Download, Eye } from 'lucide-react'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modal Detalle
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    const data = await queryAuditLogs({
      search,
      module: module || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
  }, [search, module, dateFrom, dateTo])

  // Escuchar en tiempo real nuevos logs si no hay filtro de fechas activo y refrescar
  useEffect(() => {
    if (dateFrom || dateTo) return
    const off = listenRecentLogs(() => {
      loadLogs()
    }, 100)
    return () => off()
  }, [dateFrom, dateTo, search, module])

  const filteredLogs = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((l) => {
      const matchModule = !module || l.module === module
      const matchSearch =
        !q ||
        l.user_short_name.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.action_type.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      return matchModule && matchSearch
    })
  }, [logs, search, module])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadLogs()
  }

  const exportCSV = () => {
    const headers = ['ID', 'Fecha/Hora', 'Usuario', 'Modulo', 'Accion', 'Detalles']
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${l.user_short_name}"`,
      l.module,
      l.action_type,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="size-6 text-cyan-400" />
            <span>Logs de Auditoría Global</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Trazabilidad inmutable de todas las acciones del sistema</p>
        </div>
        <button
          onClick={exportCSV}
          className="btn bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs py-2 px-3 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="size-4 text-cyan-400" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearchSubmit} className="card bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="size-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
              placeholder="Buscar por usuario, módulo, acción o detalles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              value={module}
              onChange={(e) => setModule(e.target.value)}
            >
              <option value="">Todos los Módulos</option>
              <option value="lugares">Lugares</option>
              <option value="equipos">Equipos</option>
              <option value="prestamos">Préstamos</option>
              <option value="eventos_agenda">Agenda</option>
              <option value="tasks">Tareas</option>
              <option value="profiles">Usuarios</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Fecha Desde"
            />
          </div>

          <div>
            <input
              type="date"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Fecha Hasta"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            type="submit"
            className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-1.5 text-xs rounded-lg cursor-pointer shadow-md shadow-cyan-500/20"
          >
            Aplicar Filtros
          </button>
        </div>
      </form>

      {/* Tabla de Logs */}
      <div className="card bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3 text-right">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-cyan-300">{log.user_short_name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px] text-slate-300">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">{log.action_type}</td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-xs">{log.details}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded cursor-pointer"
                    >
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron registros de auditoría con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-100 shadow-2xl animate-in space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-cyan-400 text-sm">Detalle de Registro de Auditoría</h3>
              <button
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer"
                onClick={() => setSelectedLog(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">ID de Registro:</span>
                <p className="font-mono text-slate-300 mt-0.5">{selectedLog.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-semibold">Usuario:</span>
                  <p className="text-cyan-300 font-medium">{selectedLog.user_short_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Fecha:</span>
                  <p className="text-slate-200">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-semibold">Módulo:</span>
                  <p className="text-slate-200">{selectedLog.module}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Tipo de Acción:</span>
                  <p className="text-slate-200">{selectedLog.action_type}</p>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Detalles Completos:</span>
                <pre className="mt-1 p-3 bg-slate-950 border border-slate-800 rounded text-[11px] text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.details}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
