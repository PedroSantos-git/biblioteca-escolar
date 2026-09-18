import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { RequireRole } from './auth/RequireRole'
import { Layout } from './components/Layout'
import { Admin } from './pages/Admin'
import { Catalogo } from './pages/Catalogo'
import { Circulacao } from './pages/Circulacao'
import { Espaco } from './pages/Espaco'
import { Login } from './pages/Login'
import { MeuHistorico } from './pages/MeuHistorico'
import { Utilizadores } from './pages/Utilizadores'

function Home() {
  const { role } = useAuth()
  if (role === 'visitante') return <Navigate to="/historico" replace />
  return <Navigate to="/catalogo" replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/catalogo"
          element={
            <RequireRole min="visitante">
              <Catalogo />
            </RequireRole>
          }
        />
        <Route
          path="/circulacao"
          element={
            <RequireRole min="staff">
              <Circulacao />
            </RequireRole>
          }
        />
        <Route
          path="/utilizadores"
          element={
            <RequireRole min="staff">
              <Utilizadores />
            </RequireRole>
          }
        />
        <Route
          path="/espaco"
          element={
            <RequireRole min="staff">
              <Espaco />
            </RequireRole>
          }
        />
        <Route
          path="/historico"
          element={
            <RequireRole min="visitante">
              <MeuHistorico />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole min="admin">
              <Admin />
            </RequireRole>
          }
        />
      </Route>
    </Routes>
  )
}
