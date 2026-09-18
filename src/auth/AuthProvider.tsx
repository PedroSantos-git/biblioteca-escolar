import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Operador } from '../types/db'

export type Role = 'admin' | 'staff' | 'visitante'

interface AuthState {
  session: Session | null
  operador: Operador | null
  role: Role
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function roleFromOperador(operador: Operador | null): Role {
  if (!operador || !operador.ativo) return 'visitante'
  if (operador.perfil === 'administrador') return 'admin'
  if (operador.perfil === 'consulta') return 'visitante'
  return 'staff'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [operador, setOperador] = useState<Operador | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setOperador(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('operador')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setOperador((data as Operador) ?? null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const redirectTo = window.location.origin

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  const signInWithMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo } })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value: AuthState = {
    session,
    operador,
    role: roleFromOperador(operador),
    loading,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
