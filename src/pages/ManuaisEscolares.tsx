import { Barcode, CheckCircle2, GraduationCap, IdCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner } from '../components/ui'
import type { EscalaoAse } from '../types/db'

interface Opcao {
  id: number
  nome: string
}

interface ManualLinha {
  emprestimo_id: number
  aluno: string
  turma: string | null
  disciplina: string | null
  escalao: EscalaoAse
  titulo: string
  data_entrega: string
  data_devolucao: string | null
  estado: string
}

export function ManuaisEscolares() {
  const [linhas, setLinhas] = useState<ManualLinha[] | null>(null)
  const [disciplinas, setDisciplinas] = useState<Opcao[]>([])
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [cartao, setCartao] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [aSubmeter, setASubmeter] = useState(false)

  const carregar = () => {
    supabase
      .from('manual_atribuicao')
      .select(
        'emprestimo_id, escalao, disciplina:disciplina_id(designacao), emprestimo:emprestimo_id(data_emprestimo, data_devolucao, estado, utilizador:utilizador_id(nome), exemplar:exemplar_id(obra:obra_id(titulo))), matricula:matricula_id(turma)',
      )
      .order('emprestimo_id', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const linhasMapeadas = ((data ?? []) as unknown as {
          emprestimo_id: number
          escalao: EscalaoAse
          disciplina: { designacao: string } | null
          matricula: { turma: string | null } | null
          emprestimo: {
            data_emprestimo: string
            data_devolucao: string | null
            estado: string
            utilizador: { nome: string } | null
            exemplar: { obra: { titulo: string } | null } | null
          } | null
        }[]).map((m) => ({
          emprestimo_id: m.emprestimo_id,
          aluno: m.emprestimo?.utilizador?.nome ?? '—',
          turma: m.matricula?.turma ?? null,
          disciplina: m.disciplina?.designacao ?? null,
          escalao: m.escalao,
          titulo: m.emprestimo?.exemplar?.obra?.titulo ?? '—',
          data_entrega: m.emprestimo?.data_emprestimo ?? '',
          data_devolucao: m.emprestimo?.data_devolucao ?? null,
          estado: m.emprestimo?.estado ?? 'ativo',
        }))
        setLinhas(linhasMapeadas)
      })

    supabase
      .from('disciplina')
      .select('id, designacao')
      .order('designacao')
      .then(({ data }) => setDisciplinas(((data ?? []) as { id: number; designacao: string }[]).map((d) => ({ id: d.id, nome: d.designacao }))))
  }

  useEffect(carregar, [])

  const atribuir = async () => {
    setASubmeter(true)
    setMensagem(null)
    try {
      const { data: utilizador, error: erroUtilizador } = await supabase
        .from('utilizador')
        .select('id, nome, ativo')
        .or(`cartao.eq.${cartao},nr_interno.eq.${cartao}`)
        .maybeSingle()
      if (erroUtilizador || !utilizador) throw new Error('Aluno não encontrado.')
      if (!utilizador.ativo) throw new Error('Utilizador inativo.')

      const { data: exemplar, error: erroExemplar } = await supabase
        .from('exemplar')
        .select('id, situacao')
        .eq('codigo_barras', codigoBarras)
        .maybeSingle()
      if (erroExemplar || !exemplar) throw new Error('Manual não encontrado.')
      if (exemplar.situacao !== 'disponivel') throw new Error(`Exemplar não disponível (${exemplar.situacao}).`)

      const { data: anoLetivo } = await supabase.from('ano_letivo').select('id, data_fim').eq('ativo', true).maybeSingle()
      if (!anoLetivo) throw new Error('Não há ano letivo ativo configurado.')

      const { data: matricula } = await supabase
        .from('matricula')
        .select('id, turma, escalao')
        .eq('utilizador_id', utilizador.id)
        .eq('ano_letivo_id', anoLetivo.id)
        .maybeSingle()
      if (!matricula) throw new Error('Este aluno não tem matrícula no ano letivo ativo.')

      const { data: emprestimo, error: erroInsert } = await supabase
        .from('emprestimo')
        .insert({
          exemplar_id: exemplar.id,
          utilizador_id: utilizador.id,
          ano_letivo_id: anoLetivo.id,
          tipo: 'manual',
          data_prevista_devolucao: anoLetivo.data_fim,
        })
        .select('id')
        .single()
      if (erroInsert || !emprestimo) throw new Error(erroInsert?.message ?? 'Erro ao atribuir manual.')

      const { error: erroManual } = await supabase.from('manual_atribuicao').insert({
        emprestimo_id: emprestimo.id,
        matricula_id: matricula.id,
        disciplina_id: disciplinaId ? Number(disciplinaId) : null,
        escalao: matricula.escalao,
      })
      if (erroManual) throw new Error(erroManual.message)

      setMensagem({ tipo: 'ok', texto: `Manual atribuído a ${utilizador.nome}.` })
      setCartao('')
      setCodigoBarras('')
      carregar()
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Erro inesperado.' })
    } finally {
      setASubmeter(false)
    }
  }

  const devolver = async (emprestimoId: number) => {
    await supabase
      .from('emprestimo')
      .update({ data_devolucao: new Date().toISOString().slice(0, 10), estado: 'devolvido' })
      .eq('id', emprestimoId)
    carregar()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <GraduationCap className="size-4 text-brand-600" />
            Atribuir manual
          </h2>

          {mensagem && (
            <p className={`text-sm ${mensagem.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{mensagem.texto}</p>
          )}

          <Field label="Cartão / nº de aluno">
            <div className="flex items-center gap-2">
              <IdCard className="size-4 text-slate-400" />
              <Input value={cartao} onChange={(e) => setCartao(e.target.value)} />
            </div>
          </Field>
          <Field label="Código de barras do manual">
            <div className="flex items-center gap-2">
              <Barcode className="size-4 text-slate-400" />
              <Input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} />
            </div>
          </Field>
          <Field label="Disciplina">
            <Select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
              <option value="">—</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Button loading={aSubmeter} disabled={!cartao || !codigoBarras} onClick={atribuir}>
            Atribuir
          </Button>
          <p className="text-xs text-slate-400">O escalão e a turma vêm da matrícula do aluno no ano letivo ativo.</p>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Manuais atribuídos</h2>
        <Card className="overflow-hidden">
          {linhas === null ? (
            <Spinner />
          ) : linhas.length === 0 ? (
            <EmptyState icon={<GraduationCap className="size-6" />} title="Sem manuais atribuídos" />
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white/95 backdrop-blur">
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Aluno</th>
                    <th className="px-5 py-3">Manual</th>
                    <th className="px-5 py-3">Escalão</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((m) => (
                    <tr key={m.emprestimo_id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{m.aluno}</p>
                        <p className="text-xs text-slate-400">{m.turma}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {m.titulo}
                        {m.disciplina && <span className="ml-1.5 text-xs text-slate-400">({m.disciplina})</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={m.escalao === 'sem_escalao' ? 'slate' : 'brand'}>{m.escalao}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={m.data_devolucao ? 'emerald' : m.estado === 'atrasado' ? 'red' : 'amber'}>
                          {m.data_devolucao ? 'Devolvido' : m.estado === 'atrasado' ? 'Em falta' : 'Entregue'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {!m.data_devolucao && (
                          <button
                            title="Registar devolução"
                            onClick={() => devolver(m.emprestimo_id)}
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <CheckCircle2 className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
