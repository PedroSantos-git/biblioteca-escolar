import { Calendar, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, mensagemErro } from '../components/ui'

interface Opcao {
  id: number
  nome: string
}

interface AulaLinha {
  id: number
  data: string
  hora_inicio: string
  hora_fim: string
  turma: string | null
  finalidade: string | null
  nr_alunos: number | null
  estado: string
  docente: { nome: string } | null
  disciplina: { designacao: string } | null
}

const ESTADOS = ['pedida', 'confirmada', 'realizada', 'cancelada']

export function Aulas() {
  const [linhas, setLinhas] = useState<AulaLinha[] | null>(null)
  const [docentes, setDocentes] = useState<Opcao[]>([])
  const [disciplinas, setDisciplinas] = useState<Opcao[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<AulaLinha | null>(null)

  const [data, setData] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [turma, setTurma] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [nrAlunos, setNrAlunos] = useState('')
  const [estado, setEstado] = useState('confirmada')
  const [erro, setErro] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)

  const carregar = () => {
    supabase
      .from('reserva_espaco')
      .select('id, data, hora_inicio, hora_fim, turma, finalidade, nr_alunos, estado, docente:docente_id(nome), disciplina:disciplina_id(designacao)')
      .order('data', { ascending: false })
      .order('hora_inicio')
      .limit(100)
      .then(({ data }) => setLinhas((data as unknown as AulaLinha[]) ?? []))

    supabase
      .from('utilizador')
      .select('id, nome')
      .eq('tipo', 'docente')
      .order('nome')
      .then(({ data }) => setDocentes((data as Opcao[]) ?? []))

    supabase
      .from('disciplina')
      .select('id, designacao')
      .order('designacao')
      .then(({ data }) => setDisciplinas(((data ?? []) as { id: number; designacao: string }[]).map((d) => ({ id: d.id, nome: d.designacao }))))
  }

  useEffect(carregar, [])

  const abrirNova = () => {
    setEditando(null)
    setData(new Date().toISOString().slice(0, 10))
    setHoraInicio('')
    setHoraFim('')
    setDocenteId('')
    setTurma('')
    setDisciplinaId('')
    setFinalidade('')
    setNrAlunos('')
    setEstado('confirmada')
    setErro(null)
    setModalAberto(true)
  }

  const guardar = async () => {
    setAGuardar(true)
    setErro(null)
    const { data: anoLetivo } = await supabase.from('ano_letivo').select('id').eq('ativo', true).maybeSingle()
    if (!anoLetivo) {
      setErro('Não há ano letivo ativo configurado.')
      setAGuardar(false)
      return
    }
    const payload = {
      ano_letivo_id: anoLetivo.id,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      docente_id: Number(docenteId),
      turma: turma || null,
      disciplina_id: disciplinaId ? Number(disciplinaId) : null,
      finalidade: finalidade || null,
      nr_alunos: nrAlunos ? Number(nrAlunos) : null,
      estado,
    }
    const { error } = editando
      ? await supabase.from('reserva_espaco').update(payload).eq('id', editando.id)
      : await supabase.from('reserva_espaco').insert(payload)
    setAGuardar(false)
    if (error) {
      setErro(mensagemErro(error))
      return
    }
    setModalAberto(false)
    carregar()
  }

  const eliminar = async (id: number) => {
    if (!confirm('Eliminar esta reserva?')) return
    const { error } = await supabase.from('reserva_espaco').delete().eq('id', id)
    if (error) {
      alert(mensagemErro(error))
      return
    }
    carregar()
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button onClick={abrirNova}>
          <Plus className="size-4" />
          Nova aula
        </Button>
      </div>

      <Card className="overflow-hidden">
        {linhas === null ? (
          <Spinner />
        ) : linhas.length === 0 ? (
          <EmptyState icon={<Calendar className="size-6" />} title="Sem aulas registadas" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Hora</th>
                <th className="px-5 py-3">Docente / Turma</th>
                <th className="px-5 py-3">Alunos</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{a.data}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {a.hora_inicio.slice(0, 5)}–{a.hora_fim.slice(0, 5)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {a.docente?.nome ?? '—'}
                    {a.turma && <span className="ml-1.5 text-xs text-slate-400">({a.turma})</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {a.nr_alunos ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={a.estado === 'cancelada' ? 'slate' : a.estado === 'realizada' ? 'emerald' : 'brand'}>{a.estado}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditando(a)
                          setData(a.data)
                          setHoraInicio(a.hora_inicio.slice(0, 5))
                          setHoraFim(a.hora_fim.slice(0, 5))
                          setTurma(a.turma ?? '')
                          setFinalidade(a.finalidade ?? '')
                          setNrAlunos(a.nr_alunos ? String(a.nr_alunos) : '')
                          setEstado(a.estado)
                          setErro(null)
                          setModalAberto(true)
                        }}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => eliminar(a.id)}
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar aula' : 'Nova aula na biblioteca'}>
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Field label="Início">
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </Field>
            <Field label="Fim">
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </Field>
          </div>
          <Field label="Docente">
            <Select value={docenteId} onChange={(e) => setDocenteId(e.target.value)}>
              <option value="">—</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Turma">
              <Input value={turma} onChange={(e) => setTurma(e.target.value)} />
            </Field>
            <Field label="Disciplina">
              <Select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
                <option value="">—</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nº de alunos">
              <Input type="number" value={nrAlunos} onChange={(e) => setNrAlunos(e.target.value)} />
            </Field>
            <Field label="Estado">
              <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Finalidade">
            <Input value={finalidade} onChange={(e) => setFinalidade(e.target.value)} />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button loading={aGuardar} disabled={!data || !horaInicio || !horaFim || !docenteId} onClick={guardar}>
            Guardar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
