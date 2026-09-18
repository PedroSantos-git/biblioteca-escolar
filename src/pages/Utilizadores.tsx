import { Briefcase, Building2, Pencil, Plus, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Utilizador } from '../types/db'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner, Tabs } from '../components/ui'
import { ReferenceManager } from '../components/ReferenceManager'
import { UtilizadorForm } from './UtilizadorForm'

const TIPO_LABEL: Record<Utilizador['tipo'], string> = {
  aluno: 'Aluno',
  docente: 'Docente',
  nao_docente: 'Não docente',
  externo: 'Externo',
  entidade: 'Entidade',
}

type Vista = 'utilizadores' | 'cursos' | 'entidades'

export function Utilizadores() {
  const [vista, setVista] = useState<Vista>('utilizadores')

  return (
    <div>
      <PageHeader title="Utilizadores" subtitle="Alunos, docentes, não docentes, externos e entidades." />

      <Tabs
        value={vista}
        onChange={setVista}
        options={[
          { value: 'utilizadores', label: 'Utilizadores', icon: <Users className="size-3.5" /> },
          { value: 'cursos', label: 'Cursos', icon: <Briefcase className="size-3.5" /> },
          { value: 'entidades', label: 'Entidades', icon: <Building2 className="size-3.5" /> },
        ]}
      />

      {vista === 'utilizadores' && <ListaUtilizadores />}
      {vista === 'cursos' && (
        <ReferenceManager
          tabela="curso"
          titulo="Cursos"
          icone={<Briefcase className="size-4 text-brand-600" />}
          ordenarPor="designacao"
          colunas={[
            { key: 'designacao', label: 'Designação', obrigatorio: true },
            { key: 'codigo', label: 'Código' },
            { key: 'ativo', label: 'Ativo', tipo: 'boolean' },
          ]}
        />
      )}
      {vista === 'entidades' && (
        <ReferenceManager
          tabela="entidade"
          titulo="Entidades"
          icone={<Building2 className="size-4 text-brand-600" />}
          ordenarPor="nome"
          colunas={[
            { key: 'nome', label: 'Nome', obrigatorio: true },
            { key: 'tipo', label: 'Tipo' },
            { key: 'nif', label: 'NIF' },
            { key: 'contacto', label: 'Contacto' },
            { key: 'responsavel', label: 'Responsável' },
            { key: 'ativo', label: 'Ativo', tipo: 'boolean' },
          ]}
        />
      )}
    </div>
  )
}

function ListaUtilizadores() {
  const [termo, setTermo] = useState('')
  const [linhas, setLinhas] = useState<Utilizador[] | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<number | null>(null)

  const carregar = () => {
    let query = supabase.from('utilizador').select('*').order('nome').limit(80)
    if (termo.trim()) query = query.ilike('nome', `%${termo.trim()}%`)
    query.then(({ data }) => setLinhas((data as Utilizador[]) ?? []))
  }

  useEffect(() => {
    const t = setTimeout(carregar, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Pesquisar por nome…" className="pl-10" />
        </div>
        <Button
          onClick={() => {
            setEmEdicao(null)
            setFormAberto(true)
          }}
        >
          <Plus className="size-4" />
          Novo utilizador
        </Button>
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
                <th className="px-5 py-3" />
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
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => {
                        setEmEdicao(u.id)
                        setFormAberto(true)
                      }}
                      className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {formAberto && (
        <UtilizadorForm
          utilizadorId={emEdicao}
          onClose={() => setFormAberto(false)}
          onSaved={carregar}
        />
      )}
    </div>
  )
}
