import { Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Utilizador } from '../types/db'
import { Badge, Card, EmptyState, Input, PageHeader, Spinner } from '../components/ui'

const TIPO_LABEL: Record<Utilizador['tipo'], string> = {
  aluno: 'Aluno',
  docente: 'Docente',
  nao_docente: 'Não docente',
  externo: 'Externo',
  entidade: 'Entidade',
}

export function Utilizadores() {
  const [termo, setTermo] = useState('')
  const [linhas, setLinhas] = useState<Utilizador[] | null>(null)

  useEffect(() => {
    let cancelled = false
    let query = supabase.from('utilizador').select('*').order('nome').limit(50)
    if (termo.trim()) query = query.ilike('nome', `%${termo.trim()}%`)
    query.then(({ data }) => {
      if (cancelled) return
      setLinhas((data as Utilizador[]) ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [termo])

  return (
    <div>
      <PageHeader title="Utilizadores" subtitle="Alunos, docentes, não docentes, externos e entidades." />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Pesquisar por nome…" className="pl-10" />
      </div>

      <Card className="overflow-hidden">
        {linhas === null ? (
          <Spinner label="A carregar utilizadores…" />
        ) : linhas.length === 0 ? (
          <EmptyState icon={<Users className="size-6" />} title="Sem resultados" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Nº interno</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((u, i) => (
                <tr
                  key={u.id}
                  className="animate-fade-in border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80"
                  style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone="brand">{TIPO_LABEL[u.tipo]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{u.nr_interno ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{u.email ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={u.ativo ? 'emerald' : 'slate'}>{u.ativo ? 'ativo' : 'inativo'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
