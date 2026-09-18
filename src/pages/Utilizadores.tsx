import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Utilizador } from '../types/db'

export function Utilizadores() {
  const [termo, setTermo] = useState('')
  const [linhas, setLinhas] = useState<Utilizador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    let query = supabase.from('utilizador').select('*').order('nome').limit(50)
    if (termo.trim()) query = query.ilike('nome', `%${termo.trim()}%`)
    query.then(({ data }) => {
      if (cancelled) return
      setLinhas((data as Utilizador[]) ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [termo])

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Utilizadores</h1>
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Pesquisar por nome…"
        className="mb-4 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Nº interno</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-4 py-2 text-slate-500">{u.tipo}</td>
                  <td className="px-4 py-2">{u.nr_interno ?? '—'}</td>
                  <td className="px-4 py-2">{u.email ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={u.ativo ? 'text-emerald-600' : 'text-slate-400'}>
                      {u.ativo ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Sem resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
