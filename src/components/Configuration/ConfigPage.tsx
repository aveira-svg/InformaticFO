import React, { useEffect, useState } from 'react'
import { addLugar, listenLugares } from '../../services/lugares'
import { ensureUniqueCodigo, createEquipo, listenEquipos } from '../../services/equipos'
import { listenTiposEquipo, createTipoEquipo } from '../../services/tiposEquipo'
import { listenProfiles, deleteProfile, adminCreateUser, updateProfile } from '../../services/profiles'
import { fetchAllDeletedRecords, restoreRecord, type DeletedRecord } from '../../services/recycleBin'
import { useAuth } from '../../services/AuthContext'
import type { Lugar, Equipo, TipoEquipoDoc, EstadoEquipo, Profile } from '../../types/supabase'
import { MapPin, Monitor, Layers, Users, Trash2, RefreshCcw } from 'lucide-react'

type TabType = 'lugares' | 'equipos' | 'tipos' | 'usuarios' | 'papelera'

export default function ConfigPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [activeTab, setActiveTab] = useState<TabType>('lugares')

  // Lugares
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [nombreLugar, setNombreLugar] = useState('')
  const [descLugar, setDescLugar] = useState('')
  const [savingLugar, setSavingLugar] = useState(false)

  // Tipos de equipo
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoDoc[]>([])
  const [nombreTipo, setNombreTipo] = useState('')
  const [savingTipo, setSavingTipo] = useState(false)

  // Equipos
  const [codigo, setCodigo] = useState('')
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [tipoEquipoId, setTipoEquipoId] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [estado, setEstado] = useState<EstadoEquipo>('disponible')
  const [isUnique, setIsUnique] = useState<boolean | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
  const [savingEquipo, setSavingEquipo] = useState(false)
  const [equipos, setEquipos] = useState<Equipo[]>([])

  // Usuarios (Admin-only)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserShortName, setNewUserShortName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState('')

  // Papelera de reciclaje
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([])
  const [loadingRecycle, setLoadingRecycle] = useState(false)

  useEffect(() => {
    const off1 = listenLugares(setLugares)
    const off2 = listenEquipos(setEquipos)
    const off3 = listenTiposEquipo(setTiposEquipo)
    const off4 = listenProfiles(setProfiles)
    return () => {
      off1()
      off2()
      off3()
      off4()
    }
  }, [])

  useEffect(() => {
    if (tiposEquipo.length > 0 && !tipoEquipoId) {
      setTipoEquipoId(tiposEquipo[0].id)
    }
  }, [tiposEquipo, tipoEquipoId])

  // Cargar registros eliminados cuando se activa el tab de Papelera
  const loadRecycleBin = async () => {
    setLoadingRecycle(true)
    const data = await fetchAllDeletedRecords()
    setDeletedRecords(data)
    setLoadingRecycle(false)
  }

  useEffect(() => {
    if (activeTab === 'papelera') {
      loadRecycleBin()
    }
  }, [activeTab])

  // Comprobar código único de equipo
  useEffect(() => {
    let active = true
    async function run() {
      const code = codigo.trim().toUpperCase()
      if (!code) {
        setIsUnique(null)
        return
      }
      setCheckingCode(true)
      const ok = await ensureUniqueCodigo(code)
      if (active) setIsUnique(ok)
      setCheckingCode(false)
    }
    run()
    return () => {
      active = false
    }
  }, [codigo])

  // Handlers Lugares
  async function onAddLugar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreLugar.trim()) return
    setSavingLugar(true)
    try {
      await addLugar(nombreLugar.trim(), descLugar.trim())
      setNombreLugar('')
      setDescLugar('')
    } catch (err) {
      console.error(err)
      alert('Error al agregar el lugar')
    } finally {
      setSavingLugar(false)
    }
  }

  // Handlers Equipos
  async function onAddEquipo(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim() || !nombreEquipo.trim() || isUnique === false) return
    setSavingEquipo(true)
    try {
      const id = crypto.randomUUID()
      await createEquipo(id, {
        codigo_unico: codigo.trim().toUpperCase(),
        nombre: nombreEquipo.trim(),
        tipo: tipoEquipoId || tiposEquipo[0]?.id || 'General',
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        estado,
        ubicacion_actual: '',
      })
      setCodigo('')
      setNombreEquipo('')
      setMarca('')
      setModelo('')
      setEstado('disponible')
      setIsUnique(null)
    } catch (err) {
      console.error(err)
      alert('Error al crear el equipo')
    } finally {
      setSavingEquipo(false)
    }
  }

  // Handlers Tipos
  async function onAddTipo(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreTipo.trim()) return
    setSavingTipo(true)
    try {
      const id = nombreTipo.trim().toLowerCase().replace(/\s+/g, '_')
      await createTipoEquipo(id, nombreTipo.trim())
      setNombreTipo('')
    } catch (err) {
      console.error(err)
      alert('Error al agregar el tipo de equipo')
    } finally {
      setSavingTipo(false)
    }
  }

  // Admin: Crear usuario
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setUserError('')
    if (!newUserEmail.trim() || !newUserPass.trim() || !newUserShortName.trim()) return

    const secretKey =
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNua2h6Z2lmY3ZwdnNxeHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM0NDY4NSwiZXhwIjoyMTAxOTIwNjg1fQ.a2YvsH7Z3vEOWJvYqka7AaQVTkZEnxrJB2FxoCz9fR0'

    setCreatingUser(true)
    try {
      await adminCreateUser(newUserEmail, newUserPass, newUserShortName, newUserRole, secretKey)
      alert(`Usuario ${newUserShortName} (${newUserEmail}) creado exitosamente.`)
      setNewUserEmail('')
      setNewUserPass('')
      setNewUserShortName('')
      setNewUserRole('user')
    } catch (err: any) {
      console.error(err)
      setUserError(err.message || 'Error al crear usuario.')
    } finally {
      setCreatingUser(false)
    }
  }

  // Restaurar registro
  async function handleRestore(rec: DeletedRecord) {
    try {
      await restoreRecord(rec.tableName, rec.id)
      alert(`Registro "${rec.title}" restaurado exitosamente.`)
      loadRecycleBin()
    } catch (err) {
      console.error(err)
      alert('Error al restaurar el registro.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Configuración & Administración</h2>
        <p className="text-xs text-slate-400">Gestión de ubicaciones, catálogo de equipos, usuarios y papelera de reciclaje</p>
      </div>

      {/* Tabs */}
      <div className="card bg-slate-900/90 border border-slate-800 p-0 overflow-hidden rounded-xl shadow-xl">
        <div className="flex border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('lugares')}
            className={`flex-1 min-w-[100px] px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'lugares'
                ? 'bg-slate-950 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <MapPin className="size-4" />
            <span>Lugares ({lugares.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('equipos')}
            className={`flex-1 min-w-[100px] px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'equipos'
                ? 'bg-slate-950 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Monitor className="size-4" />
            <span>Equipos ({equipos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tipos')}
            className={`flex-1 min-w-[100px] px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'tipos'
                ? 'bg-slate-950 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="size-4" />
            <span>Tipos ({tiposEquipo.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex-1 min-w-[100px] px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'usuarios'
                  ? 'bg-slate-950 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="size-4" />
              <span>Usuarios ({profiles.length})</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('papelera')}
              className={`flex-1 min-w-[100px] px-4 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'papelera'
                  ? 'bg-slate-950 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Trash2 className="size-4" />
              <span>Papelera</span>
            </button>
          )}
        </div>
      </div>

      {/* Secciones de los Tabs */}
      {activeTab === 'lugares' && (
        <div className="card bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="size-5 text-cyan-400" />
            <span>Gestión de Ubicaciones / Lugares</span>
          </h3>
          <form onSubmit={onAddLugar} className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              placeholder="Nombre del Lugar (ej: Aula A, Laboratorio 1)"
              value={nombreLugar}
              onChange={(e) => setNombreLugar(e.target.value)}
            />
            <input
              type="text"
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              placeholder="Descripción (opcional)"
              value={descLugar}
              onChange={(e) => setDescLugar(e.target.value)}
            />
            <button
              type="submit"
              disabled={savingLugar}
              className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 px-4 rounded text-xs cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {savingLugar ? 'Guardando...' : 'Agregar Lugar'}
            </button>
          </form>

          <div className="border-t border-slate-800 pt-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase">Lugares Registrados</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lugares.map((l) => (
                <div
                  key={l.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{l.nombre}</p>
                    {l.descripcion && <p className="text-[11px] text-slate-500">{l.descripcion}</p>}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      l.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {l.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'equipos' && (
        <div className="card bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Monitor className="size-5 text-cyan-400" />
            <span>Registrar Nuevo Equipo en Catálogo</span>
          </h3>
          <form onSubmit={onAddEquipo} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Código Único</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-500"
                  placeholder="PROY001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                {checkingCode && <span className="text-[10px] text-slate-500">Verificando...</span>}
                {isUnique === false && <span className="text-[10px] text-red-400">Código duplicado</span>}
                {isUnique === true && <span className="text-[10px] text-emerald-400">Disponible</span>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Nombre del Equipo</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Proyector Epson"
                  value={nombreEquipo}
                  onChange={(e) => setNombreEquipo(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Tipo de Equipo</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 outline-none"
                  value={tipoEquipoId}
                  onChange={(e) => setTipoEquipoId(e.target.value)}
                >
                  {tiposEquipo.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingEquipo || isUnique === false}
              className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 px-4 rounded text-xs cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {savingEquipo ? 'Guardando...' : 'Registrar Equipo'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'tipos' && (
        <div className="card bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="size-5 text-cyan-400" />
            <span>Categorías de Equipos</span>
          </h3>
          <form onSubmit={onAddTipo} className="flex gap-2">
            <input
              type="text"
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              placeholder="Nombre del Tipo (ej: Proyectores, Notebooks, Audio)"
              value={nombreTipo}
              onChange={(e) => setNombreTipo(e.target.value)}
            />
            <button
              type="submit"
              disabled={savingTipo}
              className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 px-4 rounded text-xs cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {savingTipo ? 'Guardando...' : 'Agregar Tipo'}
            </button>
          </form>

          <div className="border-t border-slate-800 pt-3 space-y-2">
            {tiposEquipo.map((t) => (
              <div key={t.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">{t.nombre}</span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {t.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Usuarios (Admin-Only) */}
      {activeTab === 'usuarios' && isAdmin && (
        <div className="card bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="size-5 text-cyan-400" />
              <span>Alta de Usuarios & Credenciales (Solo Administrador)</span>
            </h3>
            <p className="text-xs text-slate-400">Los usuarios no se auto-registran. El administrador otorga credenciales de acceso.</p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="usuario@odontologia.unc.edu.ar"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="••••••••"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Nombre Corto / Apellido</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Ej: Lic. Gómez"
                  value={newUserShortName}
                  onChange={(e) => setNewUserShortName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Rol de Usuario</label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                >
                  <option value="user">Usuario Regular</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {userError && <div className="text-xs text-red-400 bg-red-950/60 p-2.5 rounded border border-red-800">{userError}</div>}

            <button
              type="submit"
              disabled={creatingUser}
              className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 px-4 rounded text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              {creatingUser ? 'Creando Usuario...' : 'Crear Credenciales de Acceso'}
            </button>
          </form>

          {/* Tabla de Usuarios Existentes */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase">Usuarios Activos en el Sistema</h4>
            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              {profiles.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">
                      {p.short_name} <span className="text-slate-500">({p.email})</span>
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                        p.role === 'admin'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const newRole = p.role === 'admin' ? 'user' : 'admin'
                        if (confirm(`¿Cambiar el rol de ${p.short_name} a ${newRole}?`)) {
                          await updateProfile(p.id, { role: newRole })
                        }
                      }}
                      className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 text-[11px] rounded cursor-pointer"
                    >
                      Cambiar a {p.role === 'admin' ? 'Usuario' : 'Admin'}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Dar de baja lógica al usuario ${p.short_name}? Su acceso será bloqueado.`)) {
                          await deleteProfile(p.id)
                        }
                      }}
                      className="btn bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 px-2 py-1 text-[11px] rounded cursor-pointer"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Papelera de Reciclaje (Admin-Only) */}
      {activeTab === 'papelera' && isAdmin && (
        <div className="card bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Trash2 className="size-5 text-cyan-400" />
                <span>Papelera de Reciclaje — Registros de Baja Lógica</span>
              </h3>
              <p className="text-xs text-slate-400">Listado de registros desactivados (`is_deleted = true`). Puedes restaurarlos con un clic.</p>
            </div>
            <button
              onClick={loadRecycleBin}
              className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <RefreshCcw className="size-3.5" />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="space-y-2">
            {deletedRecords.map((rec) => (
              <div
                key={`${rec.tableName}-${rec.id}`}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-800 text-cyan-400 font-mono text-[10px] rounded font-bold uppercase">
                      {rec.tableLabel}
                    </span>
                    <span className="font-semibold text-slate-200">{rec.title}</span>
                  </div>
                  {rec.subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{rec.subtitle}</p>}
                </div>

                <button
                  onClick={() => handleRestore(rec)}
                  className="btn bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCcw className="size-3.5" />
                  <span>Restaurar</span>
                </button>
              </div>
            ))}

            {deletedRecords.length === 0 && !loadingRecycle && (
              <div className="text-center text-slate-500 py-8">
                <p className="font-medium text-slate-400">La papelera está vacía</p>
                <p className="text-xs text-slate-600 mt-0.5">No hay registros dados de baja lógica en el sistema.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
