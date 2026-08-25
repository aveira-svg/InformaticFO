import React from 'react'
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
import ResetPasswordPage from './pages/ResetPasswordPage'
import { Loader2, ShieldAlert, KeyRound } from 'lucide-react'

// Componente para proteger rutas que requieren Administrador
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()

  if (profile?.role === 'admin') {
    return <>{children}</>
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
          <span>Información de Acceso:</span>
        </p>
        <p className="text-slate-400">
          Solo un usuario Administrador existente puede otorgar o asignar permisos de Administrador a tu cuenta.
        </p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  // Detectar si el usuario está accediendo al enlace de recuperación de contraseña
  const isResetPasswordPath =
    window.location.pathname === '/reset-password' ||
    window.location.hash.includes('type=recovery')

  if (isResetPasswordPath) {
    return <ResetPasswordPage />
  }

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
        <Route
          path="/equipos"
          element={
            <ProtectedAdminRoute>
              <EquipmentPage />
            </ProtectedAdminRoute>
          }
        />
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
        <Route
          path="/config"
          element={
            <ProtectedAdminRoute>
              <ConfigPage />
            </ProtectedAdminRoute>
          }
        />
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
