import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium ${
          isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export function Layout() {
  const { session, role, operador, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">📚 Biblioteca Escolar</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavItem to="/catalogo">Catálogo</NavItem>
            {role !== 'visitante' && <NavItem to="/circulacao">Empréstimo / Devolução</NavItem>}
            {role !== 'visitante' && <NavItem to="/utilizadores">Utilizadores</NavItem>}
            {role === 'visitante' && session && <NavItem to="/historico">O meu histórico</NavItem>}
            {role === 'admin' && <NavItem to="/admin">Administração</NavItem>}
          </nav>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <span className="text-sm text-slate-500">
                  {operador?.nome ?? session.user.email}
                  {role !== 'visitante' && (
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {role === 'admin' ? 'administrador' : 'utilizador'}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => signOut()}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink to="/login" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">
                Entrar
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
