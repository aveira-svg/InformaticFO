import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import { AppLayout } from './components/Layout/AppLayout'
import Dashboard from './pages/Dashboard'
import ConfigPage from './components/Configuration/ConfigPage'
import TasksPage from './pages/TasksPage'
import EquipmentPage from './pages/EquipmentPage'
import AuditLogsPage from './pages/AuditLogsPage'
import { useDarkMode } from './hooks/useDarkMode'
import { AuthProvider, useAuth } from './services/AuthContext'
import { Login } from './components/Auth/Login'

// Componente para proteger rutas según autenticación y rol
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-slate-500 text-sm mt-3 font-medium">Verificando credenciales...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppShell() {
  useDarkMode(false)
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-slate-500 text-sm mt-3 font-medium">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
  },
  {
    path: '/tasks',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <TasksPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/equipment',
    element: (
      <ProtectedRoute adminOnly>
        <AppLayout>
          <EquipmentPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/config',
    element: (
      <ProtectedRoute adminOnly>
        <AppLayout>
          <ConfigPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/audit-logs',
    element: (
      <ProtectedRoute adminOnly>
        <AppLayout>
          <AuditLogsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
)
