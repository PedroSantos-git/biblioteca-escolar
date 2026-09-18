import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function Login() {
  const { session, signInWithGoogle, signInWithMicrosoft } = useAuth()

  if (session) return <Navigate to="/" replace />

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-center text-xl font-semibold text-slate-900">Biblioteca Escolar</h1>
      <p className="mb-6 text-center text-sm text-slate-500">Entra com a tua conta institucional.</p>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => signInWithGoogle()}
          className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Entrar com Google
        </button>
        <button
          onClick={() => signInWithMicrosoft()}
          className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Entrar com Microsoft
        </button>
      </div>
    </div>
  )
}
