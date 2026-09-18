import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button, Field, Input, Modal, Select, mensagemErro } from '../components/ui'
import type { TipoUtilizador } from '../types/db'

interface Opcao {
  id: number
  nome: string
}

const TIPOS: { value: TipoUtilizador; label: string }[] = [
  { value: 'aluno', label: 'Aluno' },
  { value: 'docente', label: 'Docente' },
  { value: 'nao_docente', label: 'Não docente' },
  { value: 'externo', label: 'Externo' },
  { value: 'entidade', label: 'Entidade' },
]

const ESCALOES = ['sem_escalao', 'A', 'B', 'C']

export function UtilizadorForm({
  utilizadorId,
  onClose,
  onSaved,
}: {
  utilizadorId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tipo, setTipo] = useState<TipoUtilizador>('aluno')
  const [nome, setNome] = useState('')
  const [nrInterno, setNrInterno] = useState('')
  const [cartao, setCartao] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [entidadeId, setEntidadeId] = useState('')
  const [perfilId, setPerfilId] = useState('')
  const [ativo, setAtivo] = useState(true)

  const [turma, setTurma] = useState('')
  const [cursoId, setCursoId] = useState('')
  const [anoEscolaridade, setAnoEscolaridade] = useState('')
  const [escalao, setEscalao] = useState('sem_escalao')
  const [matriculaId, setMatriculaId] = useState<number | null>(null)
  const [anoLetivoAtivoId, setAnoLetivoAtivoId] = useState<number | null>(null)

  const [entidades, setEntidades] = useState<Opcao[]>([])
  const [perfis, setPerfis] = useState<Opcao[]>([])
  const [cursos, setCursos] = useState<Opcao[]>([])

  const [erro, setErro] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)

  useEffect(() => {
    supabase
      .from('entidade')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setEntidades((data as Opcao[]) ?? []))
    supabase
      .from('perfil_emprestimo')
      .select('id, designacao')
      .order('designacao')
      .then(({ data }) => setPerfis(((data ?? []) as { id: number; designacao: string }[]).map((p) => ({ id: p.id, nome: p.designacao }))))
    supabase
      .from('curso')
      .select('id, designacao')
      .order('designacao')
      .then(({ data }) => setCursos(((data ?? []) as { id: number; designacao: string }[]).map((c) => ({ id: c.id, nome: c.designacao }))))
    supabase
      .from('ano_letivo')
      .select('id')
      .eq('ativo', true)
      .maybeSingle()
      .then(({ data }) => setAnoLetivoAtivoId(data?.id ?? null))
  }, [])

  useEffect(() => {
    if (!utilizadorId) return
    supabase
      .from('utilizador')
      .select('*')
      .eq('id', utilizadorId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setTipo(data.tipo)
        setNome(data.nome)
        setNrInterno(data.nr_interno ?? '')
        setCartao(data.cartao ?? '')
        setEmail(data.email ?? '')
        setTelefone(data.telefone ?? '')
        setEntidadeId(data.entidade_id ? String(data.entidade_id) : '')
        setPerfilId(data.perfil_id ? String(data.perfil_id) : '')
        setAtivo(data.ativo)
      })
  }, [utilizadorId])

  useEffect(() => {
    if (!utilizadorId || !anoLetivoAtivoId) return
    supabase
      .from('matricula')
      .select('*')
      .eq('utilizador_id', utilizadorId)
      .eq('ano_letivo_id', anoLetivoAtivoId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setMatriculaId(data.id)
        setTurma(data.turma ?? '')
        setCursoId(data.curso_id ? String(data.curso_id) : '')
        setAnoEscolaridade(data.ano_escolaridade ? String(data.ano_escolaridade) : '')
        setEscalao(data.escalao)
      })
  }, [utilizadorId, anoLetivoAtivoId])

  const guardar = async () => {
    setAGuardar(true)
    setErro(null)
    const payload = {
      tipo,
      nome,
      nr_interno: nrInterno || null,
      cartao: cartao || null,
      email: email || null,
      telefone: telefone || null,
      entidade_id: entidadeId ? Number(entidadeId) : null,
      perfil_id: perfilId ? Number(perfilId) : null,
      ativo,
    }

    let novoId = utilizadorId
    if (utilizadorId) {
      const { error } = await supabase.from('utilizador').update(payload).eq('id', utilizadorId)
      if (error) {
        setErro(mensagemErro(error))
        setAGuardar(false)
        return
      }
    } else {
      const { data, error } = await supabase.from('utilizador').insert(payload).select('id').single()
      if (error || !data) {
        setErro(error ? mensagemErro(error) : 'Erro a criar utilizador.')
        setAGuardar(false)
        return
      }
      novoId = data.id
    }

    if (tipo === 'aluno' && novoId && anoLetivoAtivoId) {
      const matriculaPayload = {
        utilizador_id: novoId,
        ano_letivo_id: anoLetivoAtivoId,
        curso_id: cursoId ? Number(cursoId) : null,
        ano_escolaridade: anoEscolaridade ? Number(anoEscolaridade) : null,
        turma: turma || null,
        escalao,
      }
      if (matriculaId) {
        await supabase.from('matricula').update(matriculaPayload).eq('id', matriculaId)
      } else {
        await supabase.from('matricula').insert(matriculaPayload)
      }
    }

    setAGuardar(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={utilizadorId ? 'Editar utilizador' : 'Novo utilizador'}>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoUtilizador)}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nº interno / mecanográfico">
            <Input value={nrInterno} onChange={(e) => setNrInterno(e.target.value)} />
          </Field>
        </div>

        <Field label="Nome *">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cartão (código de barras)">
            <Input value={cartao} onChange={(e) => setCartao(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone">
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </Field>
          <Field label="Regras de empréstimo">
            <Select value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
              <option value="">— (usa a predefinição)</option>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {(tipo === 'entidade' || tipo === 'externo') && (
          <Field label={tipo === 'entidade' ? 'Entidade *' : 'Entidade (opcional)'}>
            <Select value={entidadeId} onChange={(e) => setEntidadeId(e.target.value)}>
              <option value="">—</option>
              {entidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {tipo === 'aluno' && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-50/60 p-3">
            {!anoLetivoAtivoId && (
              <p className="col-span-2 text-xs text-amber-700">
                Não há ano letivo ativo — a matrícula não pode ser guardada até ativares um em Administração.
              </p>
            )}
            <Field label="Turma">
              <Input value={turma} onChange={(e) => setTurma(e.target.value)} />
            </Field>
            <Field label="Ano de escolaridade">
              <Input type="number" value={anoEscolaridade} onChange={(e) => setAnoEscolaridade(e.target.value)} />
            </Field>
            <Field label="Curso">
              <Select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
                <option value="">—</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Escalão ASE">
              <Select value={escalao} onChange={(e) => setEscalao(e.target.value)}>
                {ESCALOES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="size-4 rounded border-slate-300 text-brand-600" />
          Ativo
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button loading={aGuardar} disabled={!nome} onClick={guardar}>
          Guardar
        </Button>
      </div>
    </Modal>
  )
}
