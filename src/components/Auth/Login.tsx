import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { Monitor, Lock, Mail, ShieldAlert, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'

export function Login() {
  const [mode, setMode] = useState<'login' | 'recovery'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState(false)

  async function handleLogin(e: React.FormEvent) {
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

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setRecoverySuccess(false)
    setLoading(true)

    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      })

      if (resetError) {
        if (resetError.status === 429 || resetError.message?.toLowerCase().includes('rate limit') || resetError.message?.toLowerCase().includes('too many')) {
          setError('Límite de envíos alcanzado por seguridad (Error 429). Supabase limita la cantidad de correos de recuperación por hora. Por favor, espera unos minutos antes de volver a intentar o revisa tu bandeja de entrada.')
        } else {
          setError(resetError.message || 'No se pudo enviar el correo de recuperación.')
        }
      } else {
        setRecoverySuccess(true)
      }
    } catch (err: any) {
      console.error(err)
      if (err?.status === 429 || err?.message?.toLowerCase().includes('rate limit')) {
        setError('Límite de envíos alcanzado por seguridad (Error 429). Por favor, espera unos minutos antes de reintentar.')
      } else {
        setError(err?.message || 'Error al procesar la solicitud de recuperación.')
      }
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

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            {mode === 'login' ? <Monitor className="size-8" /> : <KeyRound className="size-8" />}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {mode === 'login' ? 'Control de Préstamos' : 'Recuperar Contraseña'}
          </h2>
          <p className="text-xs text-cyan-400 font-medium mt-1 uppercase tracking-wider">
            Facultad de Odontología - UNNE
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="password">
                  <Lock className="size-3.5 text-cyan-400" />
                  <span>Contraseña</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setRecoverySuccess(false)
                    setMode('recovery')
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
        ) : (
          <form onSubmit={handleRecovery} className="space-y-4 relative z-10">
            <p className="text-xs text-slate-400 text-center">
              Ingresa tu correo electrónico registrado y te enviaremos un enlace desde Supabase para restablecer tu contraseña.
            </p>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="recovery-email">
                <Mail className="size-3.5 text-cyan-400" />
                <span>Correo Electrónico Registrado</span>
              </label>
              <input
                id="recovery-email"
                type="email"
                required
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@odontologia.unc.edu.ar"
              />
            </div>

            {recoverySuccess && (
              <div className="text-xs text-emerald-400 bg-emerald-950/60 p-3.5 rounded-xl border border-emerald-800/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>¡Correo de recuperación enviado!</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Revisa tu bandeja de entrada o spam. Hemos enviado un correo desde Supabase con el enlace para restablecer tu clave.
                </p>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-950/60 p-3 rounded-xl border border-red-800/80 flex items-center gap-2">
                <ShieldAlert className="size-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all mt-2 disabled:opacity-50"
            >
              {loading ? 'Enviando Solicitud...' : 'Enviar Correo de Recuperación'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setRecoverySuccess(false)
                  setMode('login')
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-[11px] text-slate-500 pt-4 border-t border-slate-800/80">
          <span>Acceso seguro gestionado por Supabase Authentication.</span>
        </div>
      </div>
    </div>
  )
}
