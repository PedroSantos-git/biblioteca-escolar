import {
  AlertTriangle,
  ArrowLeftRight,
  Barcode,
  BookX,
  CheckCircle2,
  GraduationCap,
  IdCard,
  Repeat,
  RotateCw,
  ShieldAlert,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Utilizador } from '../types/db'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner, Tabs } from '../components/ui'
import { ManuaisEscolares } from './ManuaisEscolares'

type Aba = 'emprestimo' | 'devolucao' | 'manuais'

interface LinhaAtiva {
  id: number
  exemplar_id: number
  nr_renovacoes: number
  utilizador: string
  nr_registo: string
  titulo: string
  data_prevista_devolucao: string
  dias_atraso: number
}

export function Circulacao() {
  const [aba, setAba] = useState<Aba>('emprestimo')
  const [ativos, setAtivos] = useState<LinhaAtiva[] | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregarAtivos = async () => {
    const { data } = await supabase
      .from('emprestimo')
      .select(
        'id, exemplar_id, data_prevista_devolucao, nr_renovacoes, utilizador:utilizador_id(nome), exemplar:exemplar_id(nr_registo, obra:obra_id(titulo))',
      )
      .is('data_devolucao', null)
      .order('data_prevista_devolucao')
      .limit(100)
    const hoje = new Date().toISOString().slice(0, 10)
    const linhas: LinhaAtiva[] = ((data ?? []) as unknown as {
      id: number
      exemplar_id: number
      data_prevista_devolucao: string
      nr_renovacoes: number
      utilizador: { nome: string } | null
      exemplar: { nr_registo: string; obra: { titulo: string } | null } | null
    }[]).map((e) => ({
      id: e.id,
      exemplar_id: e.exemplar_id,
      nr_renovacoes: e.nr_renovacoes,
      utilizador: e.utilizador?.nome ?? '—',
      nr_registo: e.exemplar?.nr_registo ?? '—',
      titulo: e.exemplar?.obra?.titulo ?? '—',
      data_prevista_devolucao: e.data_prevista_devolucao,
      dias_atraso: Math.max(
        0,
        Math.round((new Date(hoje).getTime() - new Date(e.data_prevista_devolucao).getTime()) / 86_400_000),
      ),
    }))
    setAtivos(linhas)
  }

  useEffect(() => {
    carregarAtivos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const acaoEmprestimo = async (id: number, acao: 'devolver' | 'renovar' | 'perdido' | 'danificado') => {
    if (acao === 'renovar') {
      const linha = ativos?.find((a) => a.id === id)
      if (!linha) return
      const novaData = new Date(linha.data_prevista_devolucao)
      novaData.setDate(novaData.getDate() + 15)
      await supabase.from('renovacao').insert({
        emprestimo_id: id,
        data_anterior: linha.data_prevista_devolucao,
        nova_data_prevista: novaData.toISOString().slice(0, 10),
      })
      await supabase
        .from('emprestimo')
        .update({
          data_prevista_devolucao: novaData.toISOString().slice(0, 10),
          nr_renovacoes: linha.nr_renovacoes + 1,
          estado: 'ativo',
        })
        .eq('id', id)
      setMensagem({ tipo: 'ok', texto: 'Empréstimo renovado por mais 15 dias.' })
    } else if (acao === 'devolver') {
      await supabase.from('emprestimo').update({ data_devolucao: new Date().toISOString().slice(0, 10), estado: 'devolvido' }).eq('id', id)
      setMensagem({ tipo: 'ok', texto: 'Devolução registada.' })
    } else {
      const estado = acao === 'perdido' ? 'perdido' : 'danificado'
      await supabase.from('emprestimo').update({ data_devolucao: new Date().toISOString().slice(0, 10), estado }).eq('id', id)
      setMensagem({ tipo: 'ok', texto: `Exemplar marcado como ${estado}.` })
    }
    carregarAtivos()
  }

  return (
    <div>
      <PageHeader title="Circulação" subtitle="Empréstimos, devoluções e manuais escolares." />

      <Tabs
        value={aba}
        onChange={setAba}
        options={[
          { value: 'emprestimo', label: 'Empréstimo', icon: <ArrowLeftRight className="size-3.5" /> },
          { value: 'devolucao', label: 'Devolução', icon: <Repeat className="size-3.5" /> },
          { value: 'manuais', label: 'Manuais escolares', icon: <GraduationCap className="size-3.5" /> },
        ]}
      />

      {aba === 'manuais' ? (
        <ManuaisEscolares />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {mensagem && (
              <div
                className={`mb-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm animate-slide-up ${
                  mensagem.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {mensagem.tipo === 'ok' ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0" />
                )}
                {mensagem.texto}
              </div>
            )}

            {aba === 'emprestimo' ? (
              <FormularioEmprestimo
                onSucesso={(texto) => {
                  setMensagem({ tipo: 'ok', texto })
                  carregarAtivos()
                }}
                onErro={(texto) => setMensagem({ tipo: 'erro', texto })}
              />
            ) : (
              <FormularioDevolucao
                onSucesso={(texto) => {
                  setMensagem({ tipo: 'ok', texto })
                  carregarAtivos()
                }}
                onErro={(texto) => setMensagem({ tipo: 'erro', texto })}
              />
            )}
          </div>

          <div className="lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Empréstimos em curso</h2>
            <Card className="overflow-hidden">
              {ativos === null ? (
                <Spinner />
              ) : ativos.length === 0 ? (
                <EmptyState icon={<ArrowLeftRight className="size-6" />} title="Sem empréstimos em curso" />
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/95 backdrop-blur">
                      <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-3">Utilizador</th>
                        <th className="px-5 py-3">Título</th>
                        <th className="px-5 py-3">Prazo</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {ativos.map((a, i) => (
                        <tr
                          key={a.id}
                          className="animate-fade-in border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80"
                          style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">{a.utilizador}</p>
                            <p className="text-xs text-slate-400">{a.nr_registo}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{a.titulo}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {a.data_prevista_devolucao}
                              {a.dias_atraso > 0 && <Badge tone="red">{a.dias_atraso}d</Badge>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                title="Renovar"
                                onClick={() => acaoEmprestimo(a.id, 'renovar')}
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                              >
                                <RotateCw className="size-3.5" />
                              </button>
                              <button
                                title="Devolver"
                                onClick={() => acaoEmprestimo(a.id, 'devolver')}
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <CheckCircle2 className="size-3.5" />
                              </button>
                              <button
                                title="Marcar danificado"
                                onClick={() => acaoEmprestimo(a.id, 'danificado')}
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                              >
                                <ShieldAlert className="size-3.5" />
                              </button>
                              <button
                                title="Marcar perdido"
                                onClick={() => acaoEmprestimo(a.id, 'perdido')}
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <BookX className="size-3.5" />
                              </button>
                            </div>
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
      )}
    </div>
  )
}

function FormularioEmprestimo({
  onSucesso,
  onErro,
}: {
  onSucesso: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [cartao, setCartao] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [aSubmeter, setASubmeter] = useState(false)

  const submeter = async () => {
    setASubmeter(true)
    try {
      const { data: utilizador, error: erroUtilizador } = await supabase
        .from('utilizador')
        .select('id, nome, ativo')
        .or(`cartao.eq.${cartao},nr_interno.eq.${cartao}`)
        .maybeSingle<Pick<Utilizador, 'id' | 'nome' | 'ativo'>>()

      if (erroUtilizador || !utilizador) throw new Error('Utilizador não encontrado.')
      if (!utilizador.ativo) throw new Error('Utilizador inativo.')

      const { data: exemplar, error: erroExemplar } = await supabase
        .from('exemplar')
        .select('id, situacao, emprestavel')
        .eq('codigo_barras', codigoBarras)
        .maybeSingle()

      if (erroExemplar || !exemplar) throw new Error('Exemplar não encontrado.')
      if (!exemplar.emprestavel) throw new Error('Este exemplar é só de consulta local.')
      if (exemplar.situacao !== 'disponivel') throw new Error(`Exemplar não disponível (${exemplar.situacao}).`)

      const { data: anoLetivo } = await supabase.from('ano_letivo').select('id').eq('ativo', true).maybeSingle()
      if (!anoLetivo) throw new Error('Não há ano letivo ativo configurado.')

      const prazoDias = 15
      const dataPrevista = new Date()
      dataPrevista.setDate(dataPrevista.getDate() + prazoDias)

      const { error: erroInsert } = await supabase.from('emprestimo').insert({
        exemplar_id: exemplar.id,
        utilizador_id: utilizador.id,
        ano_letivo_id: anoLetivo.id,
        data_prevista_devolucao: dataPrevista.toISOString().slice(0, 10),
      })
      if (erroInsert) throw new Error(erroInsert.message)

      onSucesso(`Empréstimo registado para ${utilizador.nome}.`)
      setCartao('')
      setCodigoBarras('')
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setASubmeter(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <FieldIcon icon={<IdCard className="size-4" />} label="Cartão / nº de utilizador">
        <Input autoFocus value={cartao} onChange={(e) => setCartao(e.target.value)} />
      </FieldIcon>
      <FieldIcon icon={<Barcode className="size-4" />} label="Código de barras do exemplar">
        <Input
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submeter()}
        />
      </FieldIcon>
      <Button loading={aSubmeter} disabled={!cartao || !codigoBarras} onClick={submeter} className="w-full">
        Registar empréstimo
      </Button>
    </Card>
  )
}

function FormularioDevolucao({
  onSucesso,
  onErro,
}: {
  onSucesso: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [codigoBarras, setCodigoBarras] = useState('')
  const [aSubmeter, setASubmeter] = useState(false)

  const submeter = async () => {
    setASubmeter(true)
    try {
      const { data: exemplar, error: erroExemplar } = await supabase
        .from('exemplar')
        .select('id')
        .eq('codigo_barras', codigoBarras)
        .maybeSingle()
      if (erroExemplar || !exemplar) throw new Error('Exemplar não encontrado.')

      const { data: emprestimo, error: erroEmprestimo } = await supabase
        .from('emprestimo')
        .select('id')
        .eq('exemplar_id', exemplar.id)
        .is('data_devolucao', null)
        .maybeSingle()
      if (erroEmprestimo || !emprestimo) throw new Error('Não há empréstimo em aberto para este exemplar.')

      const { error: erroUpdate } = await supabase
        .from('emprestimo')
        .update({ data_devolucao: new Date().toISOString().slice(0, 10), estado: 'devolvido' })
        .eq('id', emprestimo.id)
      if (erroUpdate) throw new Error(erroUpdate.message)

      onSucesso('Devolução registada.')
      setCodigoBarras('')
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setASubmeter(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <FieldIcon icon={<Barcode className="size-4" />} label="Código de barras do exemplar">
        <Input
          autoFocus
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submeter()}
        />
      </FieldIcon>
      <Button loading={aSubmeter} disabled={!codigoBarras} onClick={submeter} className="w-full">
        Registar devolução
      </Button>
    </Card>
  )
}

function FieldIcon({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-600">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}
