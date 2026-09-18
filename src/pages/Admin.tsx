import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Operador, PerfilOperador } from '../types/db'

const PERFIS: PerfilOperador[] = ['administrador', 'bibliotecario', 'assistente', 'monitor', 'consulta']

export function Admin() {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<PerfilOperador>('bibliotecario')
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = () => {
    setLoading(true)
    supabase
      .from('operador')
      .select('*')
      .order('nome')
      .then(({ data }) => {
        setOperadores((data as Operador[]) ?? [])
        setLoading(false)
      })
  }

  useEffect(carregar, [])

  const criarOperador = async () => {
    const { error } = await supabase.from('operador').insert({
      nome: novoNome,
      email: novoEmail.toLowerCase().trim(),
      perfil: novoPerfil,
    })
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
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Administração</h1>

      <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Novo operador</h2>
      <div className="mb-8 flex max-w-2xl flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-600">
          Nome
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Email
          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Perfil
          <select
            value={novoPerfil}
            onChange={(e) => setNovoPerfil(e.target.value as PerfilOperador)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {PERFIS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={criarOperador}
          disabled={!novoNome || !novoEmail}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Criar
        </button>
      </div>

      {mensagem && (
        <p className={`mb-4 text-sm ${mensagem.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {mensagem.texto}
        </p>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Operadores</h2>
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Perfil</th>
                <th className="px-4 py-2">Ligado</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {operadores.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{o.nome}</td>
                  <td className="px-4 py-2">{o.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={o.perfil}
                      onChange={(e) => alterarPerfil(o.id, e.target.value as PerfilOperador)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {PERFIS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{o.auth_user_id ? 'sim' : 'ainda não'}</td>
                  <td className="px-4 py-2">
                    <span className={o.ativo ? 'text-emerald-600' : 'text-slate-400'}>
                      {o.ativo ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => alternarAtivo(o.id, o.ativo)}
                      className="text-xs text-slate-500 underline"
                    >
                      {o.ativo ? 'desativar' : 'reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
