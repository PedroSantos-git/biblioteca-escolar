import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { EmprestimoAtivoView, Utilizador } from '../types/db'

type Aba = 'emprestimo' | 'devolucao'

export function Circulacao() {
  const [aba, setAba] = useState<Aba>('emprestimo')
  const [ativos, setAtivos] = useState<EmprestimoAtivoView[]>([])
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
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Empréstimo / Devolução</h1>

      <div className="mb-4 flex gap-1">
        <button
          onClick={() => setAba('emprestimo')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${aba === 'emprestimo' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
        >
          Empréstimo
        </button>
        <button
          onClick={() => setAba('devolucao')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${aba === 'devolucao' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
        >
          Devolução
        </button>
      </div>

      {mensagem && (
        <p className={`mb-4 text-sm ${mensagem.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {mensagem.texto}
        </p>
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

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase text-slate-500">Empréstimos em curso</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Utilizador</th>
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Nº registo</th>
              <th className="px-4 py-2">Prazo</th>
              <th className="px-4 py-2">Atraso</th>
            </tr>
          </thead>
          <tbody>
            {ativos.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{a.utilizador}</td>
                <td className="px-4 py-2">{a.titulo}</td>
                <td className="px-4 py-2 text-slate-500">{a.nr_registo}</td>
                <td className="px-4 py-2">{a.data_prevista_devolucao}</td>
                <td className="px-4 py-2">
                  {a.dias_atraso > 0 ? (
                    <span className="text-red-600">{a.dias_atraso} dias</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {ativos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Sem empréstimos em curso.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    <div className="flex max-w-md flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <label className="text-sm text-slate-600">
        Cartão / nº de utilizador
        <input
          autoFocus
          value={cartao}
          onChange={(e) => setCartao(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-slate-600">
        Código de barras do exemplar
        <input
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submeter()}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        disabled={aSubmeter || !cartao || !codigoBarras}
        onClick={submeter}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Registar empréstimo
      </button>
    </div>
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
    <div className="flex max-w-md flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <label className="text-sm text-slate-600">
        Código de barras do exemplar
        <input
          autoFocus
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submeter()}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        disabled={aSubmeter || !codigoBarras}
        onClick={submeter}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Registar devolução
      </button>
    </div>
  )
}
