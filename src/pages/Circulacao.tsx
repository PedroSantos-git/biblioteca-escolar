import { AlertTriangle, ArrowLeftRight, Barcode, CheckCircle2, IdCard, Repeat } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EmprestimoAtivoView, Utilizador } from '../types/db'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner } from '../components/ui'

type Aba = 'emprestimo' | 'devolucao'

export function Circulacao() {
  const [aba, setAba] = useState<Aba>('emprestimo')
  const [ativos, setAtivos] = useState<EmprestimoAtivoView[] | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregarAtivos = () => {
    supabase
      .from('v_emprestimos_ativos')
      .select('*')
      .order('data_prevista_devolucao')
      .limit(100)
      .then(({ data }) => setAtivos((data as EmprestimoAtivoView[]) ?? []))
  }

  useEffect(carregarAtivos, [])

  return (
    <div>
      <PageHeader title="Empréstimo / Devolução" subtitle="Fluxo rápido: cartão, código de barras, Enter." />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-4 inline-flex rounded-xl border border-slate-200/70 bg-white/60 p-1 shadow-sm">
            <button
              onClick={() => setAba('emprestimo')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                aba === 'emprestimo' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowLeftRight className="size-3.5" />
              Empréstimo
            </button>
            <button
              onClick={() => setAba('devolucao')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                aba === 'devolucao' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Repeat className="size-3.5" />
              Devolução
            </button>
          </div>

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
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur">
                    <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3">Utilizador</th>
                      <th className="px-5 py-3">Título</th>
                      <th className="px-5 py-3">Prazo</th>
                      <th className="px-5 py-3">Atraso</th>
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
                        <td className="px-5 py-3.5 text-slate-600">{a.data_prevista_devolucao}</td>
                        <td className="px-5 py-3.5">
                          {a.dias_atraso > 0 ? (
                            <Badge tone="red">{a.dias_atraso}d atraso</Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
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
      <Field icon={<IdCard className="size-4" />} label="Cartão / nº de utilizador">
        <Input autoFocus value={cartao} onChange={(e) => setCartao(e.target.value)} />
      </Field>
      <Field icon={<Barcode className="size-4" />} label="Código de barras do exemplar">
        <Input
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submeter()}
        />
      </Field>
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
      <Field icon={<Barcode className="size-4" />} label="Código de barras do exemplar">
        <Input
          autoFocus
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submeter()}
        />
      </Field>
      <Button loading={aSubmeter} disabled={!codigoBarras} onClick={submeter} className="w-full">
        Registar devolução
      </Button>
    </Card>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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
