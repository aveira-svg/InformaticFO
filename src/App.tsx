import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/AuthContext'
import { AppLayout } from './components/Layout/AppLayout'
import { Login } from './components/Auth/Login'
import Dashboard from './pages/Dashboard'
import EquipmentPage from './pages/EquipmentPage'
import AgendaPage from './pages/AgendaPage'
import TasksPage from './pages/TasksPage'
import AuditLogsPage from './pages/AuditLogsPage'
import ConfigPage from './components/Configuration/ConfigPage'
import { promoteToAdmin } from './services/profiles'
import { Loader2, ShieldAlert, KeyRound } from 'lucide-react'

// Componente para proteger rutas que requieren Administrador
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const [promoting, setPromoting] = useState(false)

  if (profile?.role === 'admin') {
    return <>{children}</>
  }

  const handlePromote = async () => {
    if (!user) return
    setPromoting(true)
    try {
      await promoteToAdmin(user.id)
      alert('¡Permisos de Administrador concedidos con éxito! Recargando...')
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('Error al otorgar permisos. Revisa la consola o ejecuta la consulta SQL en Supabase.')
    } finally {
      setPromoting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-4">
      <div className="size-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
        <ShieldAlert className="size-8" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-100">Acceso Restringido a Administradores</h2>
        <p className="text-xs text-slate-400 mt-1">
          Esta sección requiere permisos de rol <span className="text-cyan-400 font-bold font-mono">ADMIN</span>. Tu cuenta actual (<span className="text-slate-200 font-semibold">{profile?.email}</span>) posee rol <span className="text-amber-400 font-mono font-bold">{profile?.role}</span>.
        </p>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <KeyRound className="size-4 text-cyan-400" />
          <span>Solución Rápida:</span>
        </p>
        <p className="text-slate-400">
          Haz clic abajo para convertir tu cuenta en Administrador automáticamente:
        </p>
      </div>

      <button
        onClick={handlePromote}
        disabled={promoting}
        className="w-full btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
      >
        {promoting ? 'Otorgando Permisos...' : 'Convertir mi Cuenta en Administrador'}
      </button>
    </div>
  )
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-3">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
        <p className="text-xs font-semibold text-slate-400">Cargando Control de Préstamos...</p>
      </div>
    )
  }

  if (!user || !profile) {
    return <Login />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipos" element={<EquipmentPage />} />
        <Route
          path="/agenda"
          element={
            <ProtectedAdminRoute>
              <AgendaPage />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/tasks" element={<TasksPage />} />
        <Route
          path="/audit"
          element={
            <ProtectedAdminRoute>
              <AuditLogsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
