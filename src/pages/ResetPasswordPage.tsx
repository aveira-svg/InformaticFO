import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../services/AuthContext'
import { Lock, CheckCircle2, ShieldAlert, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const { setIsRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Verificar si Supabase devolvió un error en el hash o query string (ej: token expirado)
    const hash = window.location.hash
    const search = window.location.search
    if (hash.includes('error') || search.includes('error')) {
      const params = new URLSearchParams(hash.replace(/^#/, '') || search.replace(/^\?/, ''))
      const desc = params.get('error_description') || params.get('error')
      if (desc) {
        setError(decodeURIComponent(desc.replace(/\+/g, ' ')))
      }
    }
  }, [])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifica ambos campos.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message || 'Error al actualizar la contraseña.')
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Ocurrió un error inesperado al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="w-full max-w-md card bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-24 -right-24 size-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            <KeyRound className="size-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Restablecer Contraseña</h2>
          <p className="text-xs text-cyan-400 font-medium mt-1 uppercase tracking-wider">
            Facultad de Odontología - UNNE
          </p>
        </div>

        {success ? (
          <div className="space-y-5 text-center relative z-10">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <CheckCircle2 className="size-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-300">¡Contraseña actualizada con éxito!</h3>
              <p className="text-xs text-slate-300">
                Tu nueva clave ha sido guardada en Supabase. Ya puedes acceder al sistema con tus nuevas credenciales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRecovery(false)
                window.history.replaceState(null, '', '/')
                window.location.href = '/'
              }}
              className="w-full btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
            >
              Ingresar al Sistema
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 relative z-10">
            <p className="text-xs text-slate-400 text-center mb-2">
              Ingresa tu nueva contraseña para actualizar el acceso a tu cuenta.
            </p>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="new-pass">
                <Lock className="size-3.5 text-cyan-400" />
                <span>Nueva Contraseña</span>
              </label>
              <div className="relative">
                <input
                  id="new-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="confirm-pass">
                <Lock className="size-3.5 text-cyan-400" />
                <span>Confirmar Nueva Contraseña</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-pass"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
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
              {loading ? 'Guardando nueva clave...' : 'Guardar Nueva Contraseña'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRecovery(false)
                  window.history.replaceState(null, '', '/')
                  window.location.href = '/'
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-[11px] text-slate-500 pt-4 border-t border-slate-800/80">
          <span>Servicio de autenticación y seguridad provisto por Supabase.</span>
        </div>
      </div>
    </div>
  )
}
