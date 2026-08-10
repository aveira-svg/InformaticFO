import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/AuthContext'
import { AppLayout } from './components/Layout/AppLayout'
import { Login } from './components/Auth/Login'
import Dashboard from './pages/Dashboard'
import EquipmentPage from './pages/EquipmentPage'
import TasksPage from './pages/TasksPage'
import AuditLogsPage from './pages/AuditLogsPage'
import ConfigPage from './components/Configuration/ConfigPage'
import { Loader2 } from 'lucide-react'

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

  const isAdmin = profile.role === 'admin'

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipos" element={<EquipmentPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        {isAdmin && <Route path="/audit" element={<AuditLogsPage />} />}
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
