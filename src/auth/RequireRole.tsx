import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from './AuthProvider'

const RANK: Record<Role, number> = { visitante: 0, staff: 1, admin: 2 }

export function RequireRole({ min, children }: { min: Role; children: ReactNode }) {
  const { session, role, loading } = useAuth()

  if (loading) return <div className="p-8 text-center text-slate-500">A carregar…</div>
  if (!session) return <Navigate to="/login" replace />
  if (RANK[role] < RANK[min]) {
    return (
      <div className="p-8 text-center text-slate-600">
        Não tens permissões para aceder a esta página.
      </div>
    )
  }
  return <>{children}</>
}
