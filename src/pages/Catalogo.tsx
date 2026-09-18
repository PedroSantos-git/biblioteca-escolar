import { BookOpen, Library, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Disponibilidade } from '../types/db'
import { Badge, Card, EmptyState, Input, PageHeader, Spinner } from '../components/ui'

export function Catalogo() {
  const [termo, setTermo] = useState('')
  const [linhas, setLinhas] = useState<Disponibilidade[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErro(null)

    let query = supabase.from('v_disponibilidade').select('*').order('titulo').limit(50)
    if (termo.trim()) query = query.ilike('titulo', `%${termo.trim()}%`)

    query.then(({ data, error }) => {
      if (cancelled) return
      if (error) setErro(error.message)
      setLinhas((data as Disponibilidade[]) ?? [])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [termo])

  const totais = useMemo(
    () =>
      linhas.reduce(
        (acc, l) => ({
          titulos: acc.titulos + 1,
          exemplares: acc.exemplares + l.total_exemplares,
          disponiveis: acc.disponiveis + l.disponiveis,
        }),
        { titulos: 0, exemplares: 0, disponiveis: 0 },
      ),
    [linhas],
  )

  return (
    <div>
      <PageHeader title="Catálogo" subtitle="Pesquisa por títulos e vê disponibilidade em tempo real." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<BookOpen className="size-4" />} label="Títulos" value={totais.titulos} />
        <StatCard icon={<Library className="size-4" />} label="Exemplares" value={totais.exemplares} />
        <StatCard
          icon={<Library className="size-4" />}
          label="Disponíveis agora"
          value={totais.disponiveis}
          tone="emerald"
        />
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Pesquisar por título…"
          className="pl-10"
        />
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="A carregar catálogo…" />
        ) : linhas.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title="Sem resultados"
            description="Tenta outro termo de pesquisa."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Exemplares</th>
                <th className="px-5 py-3">Disponíveis</th>
                <th className="px-5 py-3">Emprestados</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr
                  key={l.obra_id}
                  className="animate-fade-in border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80"
                  style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">{l.titulo}</td>
                  <td className="px-5 py-3.5 text-slate-500 capitalize">{l.tipo.replace('_', ' ')}</td>
                  <td className="px-5 py-3.5 text-slate-600">{l.total_exemplares}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={l.disponiveis > 0 ? 'emerald' : 'slate'}>{l.disponiveis}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{l.emprestados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone = 'brand',
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'brand' | 'emerald'
}) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 shadow-brand-600/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-600/25',
  }
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tones[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold leading-tight text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  )
}
