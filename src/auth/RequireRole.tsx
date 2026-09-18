import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { EmptyState, Spinner } from '../components/ui'
import { useAuth, type Role } from './AuthProvider'

const RANK: Record<Role, number> = { visitante: 0, staff: 1, admin: 2 }

export function RequireRole({ min, children }: { min: Role; children: ReactNode }) {
  const { session, role, loading } = useAuth()

  if (loading) return <Spinner label="A carregar…" />
  if (!session) return <Navigate to="/login" replace />
  if (RANK[role] < RANK[min]) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-6" />}
        title="Sem permissões"
        description="Não tens acesso a esta página. Contacta um administrador se achas que é um engano."
      />
    )
  }
  return <>{children}</>
}
