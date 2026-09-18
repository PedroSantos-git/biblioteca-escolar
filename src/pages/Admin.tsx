import { Calendar, Lock, Mail, Settings, ShieldPlus, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Operador, PerfilOperador } from '../types/db'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner, Tabs, mensagemErro } from '../components/ui'
import { ReferenceManager } from '../components/ReferenceManager'

const PERFIS: PerfilOperador[] = ['administrador', 'bibliotecario', 'assistente', 'monitor', 'consulta']
const ADMIN_FIXO = 'pedro.mf.santos@outlook.pt'

type Vista = 'operadores' | 'ano_letivo' | 'parametros'

export function Admin() {
  const [vista, setVista] = useState<Vista>('operadores')

  return (
    <div>
      <PageHeader title="Administração" subtitle="Operadores, ano letivo e parâmetros da aplicação." />

      <Tabs
        value={vista}
        onChange={setVista}
        options={[
          { value: 'operadores', label: 'Operadores', icon: <UserCog className="size-3.5" /> },
          { value: 'ano_letivo', label: 'Ano letivo', icon: <Calendar className="size-3.5" /> },
          { value: 'parametros', label: 'Parâmetros', icon: <Settings className="size-3.5" /> },
        ]}
      />

      {vista === 'operadores' && <Operadores />}
      {vista === 'ano_letivo' && (
        <ReferenceManager
          tabela="ano_letivo"
          titulo="Anos letivos"
          icone={<Calendar className="size-4 text-brand-600" />}
          ordenarPor="designacao"
          colunas={[
            { key: 'designacao', label: 'Designação', obrigatorio: true },
            { key: 'data_inicio', label: 'Início', tipo: 'date' },
            { key: 'data_fim', label: 'Fim', tipo: 'date' },
            { key: 'ativo', label: 'Ativo', tipo: 'boolean' },
          ]}
        />
      )}
      {vista === 'parametros' && <Parametros />}
    </div>
  )
}

function Parametros() {
  const [linhas, setLinhas] = useState<{ chave: string; valor: string; descricao: string | null }[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = () => {
    supabase
      .from('parametro')
      .select('*')
      .order('chave')
      .then(({ data }) => setLinhas(data ?? []))
  }

  useEffect(carregar, [])

  const guardar = async (chave: string, valor: string) => {
    setErro(null)
    const { error } = await supabase.from('parametro').update({ valor }).eq('chave', chave)
    if (error) setErro(mensagemErro(error))
    carregar()
  }

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Settings className="size-4 text-brand-600" />
        Parâmetros
      </h2>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
      <Card className="overflow-hidden">
        {linhas === null ? (
          <Spinner />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Chave</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <tr key={p.chave} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{p.chave}</td>
                  <td className="px-5 py-3.5">
                    <Input
                      defaultValue={p.valor}
                      className="w-32"
                      onBlur={(e) => e.target.value !== p.valor && guardar(p.chave, e.target.value)}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{p.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function Operadores() {
  const [operadores, setOperadores] = useState<Operador[] | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<PerfilOperador>('bibliotecario')
  const [aCriar, setACriar] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = () => {
    supabase
      .from('operador')
      .select('*')
      .order('nome')
      .then(({ data }) => setOperadores((data as Operador[]) ?? []))
  }

  useEffect(carregar, [])

  const criarOperador = async () => {
    setACriar(true)
    const { error } = await supabase.from('operador').insert({
      nome: novoNome,
      email: novoEmail.toLowerCase().trim(),
      perfil: novoPerfil,
    })
    setACriar(false)
    if (error) {
      setMensagem({ tipo: 'erro', texto: error.message })
      return
    }
    setMensagem({
      tipo: 'ok',
      texto: 'Operador criado. Fica com acesso assim que entrar pela 1ª vez com esse email.',
    })
    setNovoNome('')
    setNovoEmail('')
    carregar()
  }

  const alterarPerfil = async (id: number, perfil: PerfilOperador) => {
    await supabase.from('operador').update({ perfil }).eq('id', id)
    carregar()
  }

  const alternarAtivo = async (id: number, ativo: boolean) => {
    await supabase.from('operador').update({ ativo: !ativo }).eq('id', id)
    carregar()
  }

  return (
    <div>
      <Card className="mb-8 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ShieldPlus className="size-4 text-brand-600" />
          Novo operador
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Nome</span>
            <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="w-48" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-600">
              <Mail className="size-3.5" />
              Email
            </span>
            <Input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="w-64" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Perfil</span>
            <select
              value={novoPerfil}
              onChange={(e) => setNovoPerfil(e.target.value as PerfilOperador)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            >
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <Button loading={aCriar} onClick={criarOperador} disabled={!novoNome || !novoEmail}>
            Criar
          </Button>
        </div>

        {mensagem && (
          <p className={`mt-4 text-sm animate-slide-up ${mensagem.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {mensagem.texto}
          </p>
        )}
      </Card>

      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <UserCog className="size-4 text-brand-600" />
        Operadores
      </h2>
      <Card className="overflow-hidden">
        {operadores === null ? (
          <Spinner />
        ) : operadores.length === 0 ? (
          <EmptyState icon={<UserCog className="size-6" />} title="Ainda não há operadores" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Perfil</th>
                <th className="px-5 py-3">Ligado</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {operadores.map((o) => {
                const bloqueado = o.email.toLowerCase() === ADMIN_FIXO
                return (
                  <tr key={o.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      <span className="flex items-center gap-1.5">
                        {o.nome}
                        {bloqueado && <Lock className="size-3.5 text-slate-300" />}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{o.email}</td>
                    <td className="px-5 py-3.5">
                      {bloqueado ? (
                        <Badge tone="brand">administrador</Badge>
                      ) : (
                        <select
                          value={o.perfil}
                          onChange={(e) => alterarPerfil(o.id, e.target.value as PerfilOperador)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                        >
                          {PERFIS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{o.auth_user_id ? 'sim' : 'ainda não'}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={o.ativo ? 'emerald' : 'slate'}>{o.ativo ? 'ativo' : 'inativo'}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {bloqueado ? (
                        <span className="text-xs text-slate-300">fixo</span>
                      ) : (
                        <button
                          onClick={() => alternarAtivo(o.id, o.ativo)}
                          className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                        >
                          {o.ativo ? 'desativar' : 'reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
