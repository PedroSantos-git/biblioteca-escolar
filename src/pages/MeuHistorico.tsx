import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabaseClient'

interface LinhaHistorico {
  id: number
  data_emprestimo: string
  data_prevista_devolucao: string
  data_devolucao: string | null
  estado: string
  exemplar: { nr_registo: string; obra: { titulo: string } | null } | null
}

export function MeuHistorico() {
  const { session } = useAuth()
  const [linhas, setLinhas] = useState<LinhaHistorico[]>([])
  const [temFicha, setTemFicha] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    supabase
      .from('emprestimo')
      .select(
        'id, data_emprestimo, data_prevista_devolucao, data_devolucao, estado, exemplar:exemplar_id(nr_registo, obra:obra_id(titulo))',
      )
      .order('data_emprestimo', { ascending: false })
      .then(({ data }) => {
        const resultado = (data as unknown as LinhaHistorico[]) ?? []
        setLinhas(resultado)
        setTemFicha(resultado.length > 0)
        setLoading(false)
      })
  }, [session])

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">O meu histórico</h1>
      <p className="mb-4 text-sm text-slate-500">{session?.user.email}</p>

      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : temFicha === false ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Não encontrámos nenhum registo de biblioteca associado a este email. Se achas que é um
          engano, contacta a biblioteca.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Empréstimo</th>
                <th className="px-4 py-2">Prazo</th>
                <th className="px-4 py-2">Devolução</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {l.exemplar?.obra?.titulo ?? '—'}
                  </td>
                  <td className="px-4 py-2">{l.data_emprestimo}</td>
                  <td className="px-4 py-2">{l.data_prevista_devolucao}</td>
                  <td className="px-4 py-2">{l.data_devolucao ?? '—'}</td>
                  <td className="px-4 py-2 capitalize">{l.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
