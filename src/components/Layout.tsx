import { BookMarked, LayoutGrid, LogOut, MapPin, Repeat, ShieldCheck, User as UserIcon, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
          isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-0 -z-10 rounded-xl bg-brand-50 ring-1 ring-brand-100 animate-fade-in" />
          )}
          {icon}
          <span className="hidden sm:inline">{children}</span>
        </>
      )}
    </NavLink>
  )
}

export function Layout() {
  const { session, role, operador, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30">
              <BookMarked className="size-5" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-slate-900">
              Biblioteca Escolar
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/60 p-1 shadow-sm">
            <NavItem to="/catalogo" icon={<LayoutGrid className="size-4" />}>
              Catálogo
            </NavItem>
            {role !== 'visitante' && (
              <NavItem to="/circulacao" icon={<Repeat className="size-4" />}>
                Circulação
              </NavItem>
            )}
            {role !== 'visitante' && (
              <NavItem to="/utilizadores" icon={<Users className="size-4" />}>
                Utilizadores
              </NavItem>
            )}
            {role !== 'visitante' && (
              <NavItem to="/espaco" icon={<MapPin className="size-4" />}>
                Espaço
              </NavItem>
            )}
            {role === 'visitante' && session && (
              <NavItem to="/historico" icon={<UserIcon className="size-4" />}>
                O meu histórico
              </NavItem>
            )}
            {role === 'admin' && (
              <NavItem to="/admin" icon={<ShieldCheck className="size-4" />}>
                Administração
              </NavItem>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium leading-tight text-slate-800">
                    {operador?.nome ?? session.user.email}
                  </p>
                  {role !== 'visitante' && (
                    <span
                      className={`text-xs font-medium ${role === 'admin' ? 'text-brand-600' : 'text-slate-400'}`}
                    >
                      {role === 'admin' ? 'administrador' : 'utilizador'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  title="Sair"
                  className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/25 transition-transform active:scale-[0.98]"
              >
                Entrar
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
