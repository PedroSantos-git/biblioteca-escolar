import { BookOpen, History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../components/ui'

interface LinhaHistorico {
  id: number
  data_emprestimo: string
  data_prevista_devolucao: string
  data_devolucao: string | null
  estado: string
  exemplar: { nr_registo: string; obra: { titulo: string } | null } | null
}

const ESTADO_TONE: Record<string, 'slate' | 'emerald' | 'amber' | 'red' | 'brand'> = {
  ativo: 'brand',
  devolvido: 'emerald',
  atrasado: 'red',
  perdido: 'red',
  danificado: 'amber',
}

export function MeuHistorico() {
  const { session } = useAuth()
  const [linhas, setLinhas] = useState<LinhaHistorico[] | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('emprestimo')
      .select(
        'id, data_emprestimo, data_prevista_devolucao, data_devolucao, estado, exemplar:exemplar_id(nr_registo, obra:obra_id(titulo))',
      )
      .order('data_emprestimo', { ascending: false })
      .then(({ data }) => {
        setLinhas((data as unknown as LinhaHistorico[]) ?? [])
      })
  }, [session])

  return (
    <div>
      <PageHeader title="O meu histórico" subtitle={session?.user.email} />

      {linhas === null ? (
        <Card>
          <Spinner label="A carregar histórico…" />
        </Card>
      ) : linhas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History className="size-6" />}
            title="Sem registos"
            description="Não encontrámos nenhum registo de biblioteca associado a este email. Se achas que é um engano, contacta a biblioteca."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Empréstimo</th>
                <th className="px-5 py-3">Prazo</th>
                <th className="px-5 py-3">Devolução</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr
                  key={l.id}
                  className="animate-fade-in border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80"
                  style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    <span className="flex items-center gap-2">
                      <BookOpen className="size-4 text-slate-300" />
                      {l.exemplar?.obra?.titulo ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{l.data_emprestimo}</td>
                  <td className="px-5 py-3.5 text-slate-500">{l.data_prevista_devolucao}</td>
                  <td className="px-5 py-3.5 text-slate-500">{l.data_devolucao ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={ESTADO_TONE[l.estado] ?? 'slate'}>{l.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
