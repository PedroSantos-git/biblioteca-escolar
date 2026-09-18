import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Disponibilidade } from '../types/db'

export function Catalogo() {
  const [termo, setTermo] = useState('')
  const [linhas, setLinhas] = useState<Disponibilidade[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErro(null)

    let query = supabase.from('v_disponibilidade').select('*').order('titulo').limit(50)
    if (termo.trim()) query = query.ilike('titulo', `%${termo.trim()}%`)

    query.then(({ data, error }) => {
      if (cancelled) return
      if (error) setErro(error.message)
      setLinhas((data as Disponibilidade[]) ?? [])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [termo])

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Catálogo</h1>
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Pesquisar por título…"
        className="mb-4 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Exemplares</th>
                <th className="px-4 py-2">Disponíveis</th>
                <th className="px-4 py-2">Emprestados</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.obra_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{l.titulo}</td>
                  <td className="px-4 py-2 text-slate-500">{l.tipo}</td>
                  <td className="px-4 py-2">{l.total_exemplares}</td>
                  <td className="px-4 py-2">
                    <span className={l.disponiveis > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                      {l.disponiveis}
                    </span>
                  </td>
                  <td className="px-4 py-2">{l.emprestados}</td>
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
