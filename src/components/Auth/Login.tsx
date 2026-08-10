import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { Monitor, Lock, Mail, ShieldAlert } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        setError('Credenciales inválidas. Por favor, verifica tus datos o contacta al administrador.')
      }
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="w-full max-w-md card bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent decoration */}
        <div className="absolute -top-24 -right-24 size-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            <Monitor className="size-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Control de Préstamos</h2>
          <p className="text-xs text-cyan-400 font-medium mt-1 uppercase tracking-wider">Facultad de Odontología — UNC</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="email">
              <Mail className="size-3.5 text-cyan-400" />
              <span>Correo Electrónico</span>
            </label>
            <input
              id="email"
              type="email"
              required
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@odontologia.unc.edu.ar"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="password">
              <Lock className="size-3.5 text-cyan-400" />
              <span>Contraseña</span>
            </label>
            <input
              id="password"
              type="password"
              required
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/60 p-3 rounded-xl border border-red-800/80 flex items-center gap-2">
              <ShieldAlert className="size-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all mt-2"
          >
            {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-500 pt-4 border-t border-slate-800/80">
          <span>Acceso restringido. La asignación de cuentas es gestionada por el Administrador.</span>
        </div>
      </div>
    </div>
  )
}
