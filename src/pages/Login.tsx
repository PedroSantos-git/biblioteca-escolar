import { BookMarked } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Card } from '../components/ui'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.93.46 3.76 1.26 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.26 6.62l4.01 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="size-4.5">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}

export function Login() {
  const { session, signInWithGoogle, signInWithMicrosoft } = useAuth()

  if (session) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30">
            <BookMarked className="size-7" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-slate-900">
            Biblioteca Escolar
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">Entra com a tua conta institucional para continuar.</p>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow active:scale-[0.98]"
            >
              <GoogleIcon />
              Entrar com Google
            </button>
            <button
              onClick={() => signInWithMicrosoft()}
              className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow active:scale-[0.98]"
            >
              <MicrosoftIcon />
              Entrar com Microsoft
            </button>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          Qualquer pessoa da escola pode entrar. O acesso a operações da biblioteca depende do teu perfil.
        </p>
      </div>
    </div>
  )
}
