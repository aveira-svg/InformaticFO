import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext'
import { listenPendingTasks } from '../../services/tasks'
import { LayoutDashboard, Monitor, ClipboardList, FileText, Settings, LogOut, User } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const off = listenPendingTasks((tasks) => {
      setPendingCount(tasks.length)
    })
    return () => off()
  }, [])

  const isAdmin = profile?.role === 'admin'

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Equipos', path: '/equipos', icon: Monitor },
    { label: 'Tareas', path: '/tasks', icon: ClipboardList, badge: pendingCount },
    ...(isAdmin ? [{ label: 'Auditoría', path: '/audit', icon: FileText }] : []),
    { label: 'Configuración', path: '/config', icon: Settings },
  ]

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Fija (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/80 backdrop-blur-lg fixed inset-y-0 z-30">
        {/* Brand Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shadow-lg shadow-cyan-500/10">
            FO
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 tracking-tight leading-tight">Control de Préstamos</h1>
            <p className="text-[10px] text-cyan-400/80 font-medium">Facultad de Odontología</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="size-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <User className="size-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{profile?.short_name || 'Usuario'}</p>
              <span
                className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold tracking-wider ${
                  isAdmin ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {profile?.role || 'user'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`size-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500 text-slate-950 rounded-full shadow-sm shadow-cyan-500/20">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 border border-red-900/30 transition-colors cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-dvh">
        {/* Top Header (Mobile & PC) */}
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-bold text-slate-100">
              {location.pathname === '/' && 'Dashboard de Infraestructura'}
              {location.pathname === '/equipos' && 'Inventario de Equipos'}
              {location.pathname === '/tasks' && 'Tareas y Mantenimiento'}
              {location.pathname === '/audit' && 'Logs de Auditoría'}
              {location.pathname === '/config' && 'Panel de Configuración'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Pending Badge */}
            {pendingCount > 0 && (
              <Link
                to="/tasks"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold animate-pulse"
              >
                <ClipboardList className="size-3.5" />
                <span>{pendingCount} Pendiente(s)</span>
              </Link>
            )}

            {/* Profile Info (Mobile) */}
            <div className="md:hidden flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">{profile?.short_name}</span>
              <button
                onClick={() => signOut()}
                className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-3 sm:p-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`size-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 right-2 size-4 bg-cyan-500 text-slate-950 text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-sm shadow-cyan-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
