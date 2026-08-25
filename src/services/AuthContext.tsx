import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import type { Profile } from '../types/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isRecovery: boolean
  setIsRecovery: (v: boolean) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecovery, setIsRecovery] = useState<boolean>(() => {
    return (
      window.location.pathname === '/reset-password' ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    )
  })

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        await supabase.auth.signOut()
        return
      }

      if (data) {
        if (data.is_deleted) {
          alert('Acceso Denegado: Tu cuenta ha sido desactivada por el Administrador.')
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
        } else {
          setProfile(data)
        }
      } else {
        // En caso de que se loguee pero el trigger tarde un momento en crear el perfil, re-intentar
        setTimeout(() => fetchProfile(userId), 1000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Obtener la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Suscribirse a los cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
      if (session) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isRecovery, setIsRecovery, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
