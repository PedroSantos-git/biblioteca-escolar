import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, mensagemErro } from './ui'

export interface ColunaRef {
  key: string
  label: string
  tipo?: 'text' | 'number' | 'boolean' | 'date'
  obrigatorio?: boolean
}

type Registo = Record<string, unknown> & { id: number }

export function ReferenceManager({
  tabela,
  titulo,
  icone,
  colunas,
  ordenarPor,
}: {
  tabela: string
  titulo: string
  icone: React.ReactNode
  colunas: ColunaRef[]
  ordenarPor: string
}) {
  const [linhas, setLinhas] = useState<Registo[] | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Registo | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)

  const carregar = () => {
    supabase
      .from(tabela)
      .select('*')
      .order(ordenarPor)
      .then(({ data }) => setLinhas((data as Registo[]) ?? []))
  }

  useEffect(carregar, [tabela])

  const abrirNovo = () => {
    setEditando(null)
    setForm(Object.fromEntries(colunas.map((c) => [c.key, c.tipo === 'boolean' ? true : ''])))
    setErro(null)
    setModalAberto(true)
  }

  const abrirEditar = (r: Registo) => {
    setEditando(r)
    setForm(Object.fromEntries(colunas.map((c) => [c.key, r[c.key] ?? ''])))
    setErro(null)
    setModalAberto(true)
  }

  const guardar = async () => {
    setAGuardar(true)
    setErro(null)
    const payload = Object.fromEntries(
      colunas.map((c) => [c.key, c.tipo === 'number' && form[c.key] === '' ? null : form[c.key]]),
    )
    const { error } = editando
      ? await supabase.from(tabela).update(payload).eq('id', editando.id)
      : await supabase.from(tabela).insert(payload)
    setAGuardar(false)
    if (error) {
      setErro(mensagemErro(error))
      return
    }
    setModalAberto(false)
    carregar()
  }

  const eliminar = async (r: Registo) => {
    if (!confirm('Eliminar este registo?')) return
    const { error } = await supabase.from(tabela).delete().eq('id', r.id)
    if (error) {
      alert(mensagemErro(error))
      return
    }
    carregar()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icone}
          {titulo}
        </h2>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="size-3.5" />
          Novo
        </Button>
      </div>

      <Card className="overflow-hidden">
        {linhas === null ? (
          <Spinner />
        ) : linhas.length === 0 ? (
          <EmptyState icon={icone} title="Sem registos" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                {colunas.map((c) => (
                  <th key={c.key} className="px-5 py-3">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80">
                  {colunas.map((c) => (
                    <td key={c.key} className="px-5 py-3 text-slate-700">
                      {c.tipo === 'boolean' ? (
                        <Badge tone={r[c.key] ? 'emerald' : 'slate'}>{r[c.key] ? 'ativo' : 'inativo'}</Badge>
                      ) : (
                        String(r[c.key] ?? '—')
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(r)}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => eliminar(r)}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? `Editar ${titulo}` : `Novo em ${titulo}`}>
        <div className="flex flex-col gap-3.5">
          {colunas.map((c) =>
            c.tipo === 'boolean' ? (
              <label key={c.key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[c.key])}
                  onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.checked }))}
                  className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {c.label}
              </label>
            ) : (
              <Field key={c.key} label={c.label}>
                <Input
                  type={c.tipo === 'number' ? 'number' : c.tipo === 'date' ? 'date' : 'text'}
                  value={form[c.key] as string | number}
                  onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                />
              </Field>
            ),
          )}
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button loading={aGuardar} onClick={guardar} className="mt-1">
            Guardar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
