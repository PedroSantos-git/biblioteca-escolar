import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Badge, Button, Field, Input, Modal, Select, Textarea, mensagemErro } from '../components/ui'
import type { EstadoFisico, SituacaoExemplar, TipoDocumento } from '../types/db'

interface Opcao {
  id: number
  nome: string
}

interface ExemplarLinha {
  id: number
  nr_registo: string
  codigo_barras: string | null
  cota: string | null
  estado_conservacao: EstadoFisico
  situacao: SituacaoExemplar
  emprestavel: boolean
}

const TIPOS: { value: TipoDocumento; label: string }[] = [
  { value: 'monografia', label: 'Monografia' },
  { value: 'manual_escolar', label: 'Manual escolar' },
  { value: 'periodico', label: 'Periódico' },
  { value: 'audiovisual', label: 'Audiovisual' },
  { value: 'jogo', label: 'Jogo' },
  { value: 'outro', label: 'Outro' },
]

const ESTADOS_FISICOS: EstadoFisico[] = ['bom', 'razoavel', 'danificado', 'inutilizado']
const SITUACOES: SituacaoExemplar[] = ['disponivel', 'emprestado', 'reservado', 'reparacao', 'extraviado', 'abatido']

export function ObraForm({ obraId, onClose, onSaved }: { obraId: number | null; onClose: () => void; onSaved: () => void }) {
  const [id, setId] = useState<number | null>(obraId)
  const [tipo, setTipo] = useState<TipoDocumento>('monografia')
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [autores, setAutores] = useState('')
  const [editoraId, setEditoraId] = useState<string>('')
  const [anoEdicao, setAnoEdicao] = useState('')
  const [isbn, setIsbn] = useState('')
  const [cdu, setCdu] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [disciplinaId, setDisciplinaId] = useState<string>('')
  const [anoEscolaridade, setAnoEscolaridade] = useState('')
  const [resumo, setResumo] = useState('')

  const [editoras, setEditoras] = useState<Opcao[]>([])
  const [categorias, setCategorias] = useState<Opcao[]>([])
  const [disciplinas, setDisciplinas] = useState<Opcao[]>([])
  const [localizacoes, setLocalizacoes] = useState<{ id: number; rotulo: string }[]>([])

  const [exemplares, setExemplares] = useState<ExemplarLinha[]>([])
  const [novoRegisto, setNovoRegisto] = useState('')
  const [novoCodigoBarras, setNovoCodigoBarras] = useState('')
  const [novaCota, setNovaCota] = useState('')
  const [novaLocalizacaoId, setNovaLocalizacaoId] = useState('')

  const [erro, setErro] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)
  const [aAdicionarExemplar, setAAdicionarExemplar] = useState(false)

  useEffect(() => {
    supabase
      .from('editora')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setEditoras((data as Opcao[]) ?? []))
    supabase
      .from('categoria')
      .select('id, designacao')
      .order('designacao')
      .then(({ data }) => setCategorias(((data ?? []) as { id: number; designacao: string }[]).map((c) => ({ id: c.id, nome: c.designacao }))))
    supabase
      .from('disciplina')
      .select('id, designacao')
      .order('designacao')
      .then(({ data }) => setDisciplinas(((data ?? []) as { id: number; designacao: string }[]).map((d) => ({ id: d.id, nome: d.designacao }))))
    supabase
      .from('localizacao')
      .select('id, sala, estante, prateleira')
      .then(({ data }) =>
        setLocalizacoes(
          ((data ?? []) as { id: number; sala: string | null; estante: string | null; prateleira: string | null }[]).map((l) => ({
            id: l.id,
            rotulo: [l.sala, l.estante, l.prateleira].filter(Boolean).join(' / ') || `Localização #${l.id}`,
          })),
        ),
      )
  }, [])

  const carregarExemplares = (obraId: number) => {
    supabase
      .from('exemplar')
      .select('id, nr_registo, codigo_barras, cota, estado_conservacao, situacao, emprestavel')
      .eq('obra_id', obraId)
      .order('nr_registo')
      .then(({ data }) => setExemplares((data as ExemplarLinha[]) ?? []))
  }

  useEffect(() => {
    if (!id) return
    supabase
      .from('obra')
      .select('*, obra_autor(autor(nome))')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setTipo(data.tipo)
        setTitulo(data.titulo)
        setSubtitulo(data.subtitulo ?? '')
        setEditoraId(data.editora_id ? String(data.editora_id) : '')
        setAnoEdicao(data.ano_edicao ? String(data.ano_edicao) : '')
        setIsbn(data.isbn ?? '')
        setCdu(data.cdu ?? '')
        setCategoriaId(data.categoria_id ? String(data.categoria_id) : '')
        setDisciplinaId(data.disciplina_id ? String(data.disciplina_id) : '')
        setAnoEscolaridade(data.ano_escolaridade ? String(data.ano_escolaridade) : '')
        setResumo(data.resumo ?? '')
        const nomes = (data.obra_autor as unknown as { autor: { nome: string } }[])?.map((oa) => oa.autor?.nome).filter(Boolean)
        setAutores((nomes ?? []).join(', '))
      })
    carregarExemplares(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const sincronizarAutores = async (obraId: number) => {
    const nomes = autores
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    if (nomes.length === 0) {
      await supabase.from('obra_autor').delete().eq('obra_id', obraId)
      return
    }
    const autorIds: number[] = []
    for (const nome of nomes) {
      const { data: existente } = await supabase.from('autor').select('id').eq('nome', nome).maybeSingle()
      if (existente) {
        autorIds.push(existente.id)
      } else {
        const { data: criado, error } = await supabase.from('autor').insert({ nome }).select('id').single()
        if (!error && criado) autorIds.push(criado.id)
      }
    }
    await supabase.from('obra_autor').delete().eq('obra_id', obraId)
    if (autorIds.length > 0) {
      await supabase.from('obra_autor').insert(autorIds.map((autor_id) => ({ obra_id: obraId, autor_id })))
    }
  }

  const guardar = async () => {
    setAGuardar(true)
    setErro(null)
    const payload = {
      tipo,
      titulo,
      subtitulo: subtitulo || null,
      editora_id: editoraId ? Number(editoraId) : null,
      ano_edicao: anoEdicao ? Number(anoEdicao) : null,
      isbn: isbn || null,
      cdu: cdu || null,
      categoria_id: categoriaId ? Number(categoriaId) : null,
      disciplina_id: disciplinaId ? Number(disciplinaId) : null,
      ano_escolaridade: anoEscolaridade ? Number(anoEscolaridade) : null,
      resumo: resumo || null,
    }

    if (id) {
      const { error } = await supabase.from('obra').update(payload).eq('id', id)
      if (error) {
        setErro(mensagemErro(error))
        setAGuardar(false)
        return
      }
      await sincronizarAutores(id)
      setAGuardar(false)
      onSaved()
      return
    }

    const { data, error } = await supabase.from('obra').insert(payload).select('id').single()
    setAGuardar(false)
    if (error || !data) {
      setErro(error ? mensagemErro(error) : 'Erro a criar obra.')
      return
    }
    await sincronizarAutores(data.id)
    setId(data.id)
    onSaved()
  }

  const adicionarExemplar = async () => {
    if (!id || !novoRegisto.trim()) return
    setAAdicionarExemplar(true)
    const { error } = await supabase.from('exemplar').insert({
      obra_id: id,
      nr_registo: novoRegisto.trim(),
      codigo_barras: novoCodigoBarras.trim() || null,
      cota: novaCota.trim() || null,
      localizacao_id: novaLocalizacaoId ? Number(novaLocalizacaoId) : null,
    })
    setAAdicionarExemplar(false)
    if (error) {
      alert(mensagemErro(error))
      return
    }
    setNovoRegisto('')
    setNovoCodigoBarras('')
    setNovaCota('')
    carregarExemplares(id)
    onSaved()
  }

  const atualizarExemplar = async (exemplarId: number, campo: string, valor: string | boolean) => {
    await supabase
      .from('exemplar')
      .update({ [campo]: valor })
      .eq('id', exemplarId)
    if (id) carregarExemplares(id)
  }

  const eliminarExemplar = async (exemplarId: number) => {
    if (!confirm('Eliminar este exemplar?')) return
    const { error } = await supabase.from('exemplar').delete().eq('id', exemplarId)
    if (error) {
      alert(mensagemErro(error))
      return
    }
    if (id) carregarExemplares(id)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={id ? 'Editar obra' : 'Nova obra'} width="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="CDU">
            <Input value={cdu} onChange={(e) => setCdu(e.target.value)} />
          </Field>
        </div>

        <Field label="Título *">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>
        <Field label="Subtítulo">
          <Input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
        </Field>
        <Field label="Autor(es) — separados por vírgula">
          <Input value={autores} onChange={(e) => setAutores(e.target.value)} placeholder="Saramago, José" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Editora">
            <Select value={editoraId} onChange={(e) => setEditoraId(e.target.value)}>
              <option value="">—</option>
              {editoras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ano de edição">
            <Input type="number" value={anoEdicao} onChange={(e) => setAnoEdicao(e.target.value)} />
          </Field>
          <Field label="ISBN/ISSN">
            <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          </Field>
        </div>

        <Field label="Categoria">
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">—</option>
            {categorias.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
        </Field>

        {tipo === 'manual_escolar' && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-50/60 p-3">
            <Field label="Disciplina">
              <Select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
                <option value="">—</option>
                {disciplinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ano de escolaridade">
              <Input type="number" value={anoEscolaridade} onChange={(e) => setAnoEscolaridade(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Resumo">
          <Textarea rows={2} value={resumo} onChange={(e) => setResumo(e.target.value)} />
        </Field>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button loading={aGuardar} disabled={!titulo} onClick={guardar}>
          {id ? 'Guardar alterações' : 'Criar obra'}
        </Button>

        {id && (
          <div className="mt-2 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Exemplares ({exemplares.length})</h3>

            <div className="mb-3 flex flex-col gap-2">
              {exemplares.map((ex) => (
                <div key={ex.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs">
                  <span className="font-medium text-slate-700">{ex.nr_registo}</span>
                  {ex.cota && <Badge tone="slate">{ex.cota}</Badge>}
                  <select
                    value={ex.situacao}
                    onChange={(e) => atualizarExemplar(ex.id, 'situacao', e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    {SITUACOES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ex.estado_conservacao}
                    onChange={(e) => atualizarExemplar(ex.id, 'estado_conservacao', e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    {ESTADOS_FISICOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-slate-500">
                    <input
                      type="checkbox"
                      checked={ex.emprestavel}
                      onChange={(e) => atualizarExemplar(ex.id, 'emprestavel', e.target.checked)}
                    />
                    emprestável
                  </label>
                  <button
                    onClick={() => eliminarExemplar(ex.id)}
                    className="ml-auto flex size-6 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <Field label="Nº registo *">
                <Input value={novoRegisto} onChange={(e) => setNovoRegisto(e.target.value)} className="w-32" />
              </Field>
              <Field label="Código de barras">
                <Input value={novoCodigoBarras} onChange={(e) => setNovoCodigoBarras(e.target.value)} className="w-36" />
              </Field>
              <Field label="Cota">
                <Input value={novaCota} onChange={(e) => setNovaCota(e.target.value)} className="w-24" />
              </Field>
              <Field label="Localização">
                <Select value={novaLocalizacaoId} onChange={(e) => setNovaLocalizacaoId(e.target.value)} className="w-40">
                  <option value="">—</option>
                  {localizacoes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.rotulo}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button size="sm" loading={aAdicionarExemplar} disabled={!novoRegisto.trim()} onClick={adicionarExemplar}>
                <Plus className="size-3.5" />
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
