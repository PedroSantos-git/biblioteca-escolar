import { BookOpen, Building2, Layers, Library, MapPin, Pencil, Plus, Search, Tag, Users2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Disponibilidade } from '../types/db'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner, Tabs } from '../components/ui'
import { ReferenceManager } from '../components/ReferenceManager'
import { ObraForm } from './ObraForm'
import { useAuth } from '../auth/AuthProvider'

type Vista = 'titulos' | 'autores' | 'editoras' | 'categorias' | 'disciplinas' | 'localizacoes'

export function Catalogo() {
  const { role } = useAuth()
  const isStaff = role !== 'visitante'
  const [vista, setVista] = useState<Vista>('titulos')

  return (
    <div>
      <PageHeader title="Catálogo" subtitle="Títulos, exemplares e dados de referência." />

      {isStaff && (
        <Tabs
          value={vista}
          onChange={setVista}
          options={[
            { value: 'titulos', label: 'Títulos', icon: <BookOpen className="size-3.5" /> },
            { value: 'autores', label: 'Autores', icon: <Users2 className="size-3.5" /> },
            { value: 'editoras', label: 'Editoras', icon: <Building2 className="size-3.5" /> },
            { value: 'categorias', label: 'Categorias', icon: <Tag className="size-3.5" /> },
            { value: 'disciplinas', label: 'Disciplinas', icon: <Layers className="size-3.5" /> },
            { value: 'localizacoes', label: 'Localizações', icon: <MapPin className="size-3.5" /> },
          ]}
        />
      )}

      {vista === 'titulos' && <Titulos isStaff={isStaff} />}
      {vista === 'autores' && (
        <ReferenceManager tabela="autor" titulo="Autores" icone={<Users2 className="size-4 text-brand-600" />} ordenarPor="nome" colunas={[{ key: 'nome', label: 'Nome', obrigatorio: true }]} />
      )}
      {vista === 'editoras' && (
        <ReferenceManager tabela="editora" titulo="Editoras" icone={<Building2 className="size-4 text-brand-600" />} ordenarPor="nome" colunas={[{ key: 'nome', label: 'Nome', obrigatorio: true }]} />
      )}
      {vista === 'categorias' && (
        <ReferenceManager
          tabela="categoria"
          titulo="Categorias"
          icone={<Tag className="size-4 text-brand-600" />}
          ordenarPor="designacao"
          colunas={[
            { key: 'designacao', label: 'Designação', obrigatorio: true },
            { key: 'cdu_base', label: 'CDU base' },
          ]}
        />
      )}
      {vista === 'disciplinas' && (
        <ReferenceManager
          tabela="disciplina"
          titulo="Disciplinas"
          icone={<Layers className="size-4 text-brand-600" />}
          ordenarPor="designacao"
          colunas={[
            { key: 'designacao', label: 'Designação', obrigatorio: true },
            { key: 'codigo', label: 'Código' },
          ]}
        />
      )}
      {vista === 'localizacoes' && (
        <ReferenceManager
          tabela="localizacao"
          titulo="Localizações"
          icone={<MapPin className="size-4 text-brand-600" />}
          ordenarPor="sala"
          colunas={[
            { key: 'sala', label: 'Sala' },
            { key: 'estante', label: 'Estante' },
            { key: 'prateleira', label: 'Prateleira' },
            { key: 'descricao', label: 'Descrição' },
          ]}
        />
      )}
    </div>
  )
}

function Titulos({ isStaff }: { isStaff: boolean }) {
  const [termo, setTermo] = useState('')
  const [linhas, setLinhas] = useState<Disponibilidade[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [obraEmEdicao, setObraEmEdicao] = useState<number | null>(null)

  const carregar = () => {
    let query = supabase.from('v_disponibilidade').select('*').order('titulo').limit(80)
    if (termo.trim()) query = query.ilike('titulo', `%${termo.trim()}%`)
    query.then(({ data, error }) => {
      if (error) setErro(error.message)
      setLinhas((data as Disponibilidade[]) ?? [])
    })
  }

  useEffect(() => {
    const t = setTimeout(carregar, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo])

  const totais = useMemo(
    () =>
      (linhas ?? []).reduce(
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
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<BookOpen className="size-4" />} label="Títulos" value={totais.titulos} />
        <StatCard icon={<Library className="size-4" />} label="Exemplares" value={totais.exemplares} />
        <StatCard icon={<Library className="size-4" />} label="Disponíveis agora" value={totais.disponiveis} tone="emerald" />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Pesquisar por título…" className="pl-10" />
        </div>
        {isStaff && (
          <Button
            onClick={() => {
              setObraEmEdicao(null)
              setFormAberto(true)
            }}
          >
            <Plus className="size-4" />
            Nova obra
          </Button>
        )}
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      <Card className="overflow-hidden">
        {linhas === null ? (
          <Spinner label="A carregar catálogo…" />
        ) : linhas.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-6" />} title="Sem resultados" description="Tenta outro termo de pesquisa." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Exemplares</th>
                <th className="px-5 py-3">Disponíveis</th>
                <th className="px-5 py-3">Emprestados</th>
                {isStaff && <th className="px-5 py-3" />}
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
                  {isStaff && (
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => {
                          setObraEmEdicao(l.obra_id)
                          setFormAberto(true)
                        }}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {formAberto && (
        <ObraForm
          obraId={obraEmEdicao}
          onClose={() => setFormAberto(false)}
          onSaved={() => {
            carregar()
          }}
        />
      )}
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
