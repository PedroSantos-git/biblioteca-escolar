import { Laptop, LogIn, LogOut, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, mensagemErro } from '../components/ui'
import type { EstadoEquipamento } from '../types/db'

interface EquipamentoLinha {
  id: number
  tipo: string
  designacao: string
  nr_inventario: string | null
  estado: EstadoEquipamento
}

interface UsoLinha {
  id: number
  inicio: string
  fim: string | null
  finalidade: string | null
  equipamento: { designacao: string } | null
  utilizador: { nome: string } | null
}

const ESTADOS: EstadoEquipamento[] = ['operacional', 'avaria', 'manutencao', 'abatido']

export function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoLinha[] | null>(null)
  const [usos, setUsos] = useState<UsoLinha[] | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<EquipamentoLinha | null>(null)
  const [tipo, setTipo] = useState('')
  const [designacao, setDesignacao] = useState('')
  const [nrInventario, setNrInventario] = useState('')
  const [estado, setEstado] = useState<EstadoEquipamento>('operacional')
  const [erro, setErro] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)

  const [cartao, setCartao] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [aRegistarUso, setARegistarUso] = useState(false)
  const [erroUso, setErroUso] = useState<string | null>(null)

  const carregar = () => {
    supabase
      .from('equipamento')
      .select('id, tipo, designacao, nr_inventario, estado')
      .order('designacao')
      .then(({ data }) => setEquipamentos((data as EquipamentoLinha[]) ?? []))

    supabase
      .from('utilizacao_equipamento')
      .select('id, inicio, fim, finalidade, equipamento:equipamento_id(designacao), utilizador:utilizador_id(nome)')
      .order('inicio', { ascending: false })
      .limit(50)
      .then(({ data }) => setUsos((data as unknown as UsoLinha[]) ?? []))
  }

  useEffect(carregar, [])

  const abrirNovo = () => {
    setEditando(null)
    setTipo('')
    setDesignacao('')
    setNrInventario('')
    setEstado('operacional')
    setErro(null)
    setModalAberto(true)
  }

  const guardar = async () => {
    setAGuardar(true)
    setErro(null)
    const payload = { tipo, designacao, nr_inventario: nrInventario || null, estado }
    const { error } = editando
      ? await supabase.from('equipamento').update(payload).eq('id', editando.id)
      : await supabase.from('equipamento').insert(payload)
    setAGuardar(false)
    if (error) {
      setErro(mensagemErro(error))
      return
    }
    setModalAberto(false)
    carregar()
  }

  const eliminar = async (id: number) => {
    if (!confirm('Eliminar este equipamento?')) return
    const { error } = await supabase.from('equipamento').delete().eq('id', id)
    if (error) {
      alert(mensagemErro(error))
      return
    }
    carregar()
  }

  const iniciarUso = async () => {
    setARegistarUso(true)
    setErroUso(null)
    try {
      const { data: utilizador, error: erroUtilizador } = await supabase
        .from('utilizador')
        .select('id')
        .or(`cartao.eq.${cartao},nr_interno.eq.${cartao}`)
        .maybeSingle()
      if (erroUtilizador || !utilizador) throw new Error('Utilizador não encontrado.')
      if (!equipamentoId) throw new Error('Escolhe um equipamento.')

      const { error } = await supabase.from('utilizacao_equipamento').insert({
        equipamento_id: Number(equipamentoId),
        utilizador_id: utilizador.id,
        finalidade: finalidade || null,
      })
      if (error) throw new Error(mensagemErro(error))

      setCartao('')
      setEquipamentoId('')
      setFinalidade('')
      carregar()
    } catch (e) {
      setErroUso(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setARegistarUso(false)
    }
  }

  const terminarUso = async (id: number) => {
    await supabase.from('utilizacao_equipamento').update({ fim: new Date().toISOString() }).eq('id', id)
    carregar()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="flex flex-col gap-3.5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <LogIn className="size-4 text-brand-600" />
            Registar utilização
          </h2>
          {erroUso && <p className="text-sm text-red-600">{erroUso}</p>}
          <Field label="Cartão / nº de utilizador">
            <Input value={cartao} onChange={(e) => setCartao(e.target.value)} />
          </Field>
          <Field label="Equipamento">
            <Select value={equipamentoId} onChange={(e) => setEquipamentoId(e.target.value)}>
              <option value="">—</option>
              {(equipamentos ?? [])
                .filter((eq) => eq.estado === 'operacional')
                .map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.designacao} {eq.nr_inventario ? `(${eq.nr_inventario})` : ''}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Finalidade">
            <Input value={finalidade} onChange={(e) => setFinalidade(e.target.value)} placeholder="trabalho / leitura / jogos…" />
          </Field>
          <Button loading={aRegistarUso} disabled={!cartao || !equipamentoId} onClick={iniciarUso}>
            Iniciar utilização
          </Button>
        </Card>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Laptop className="size-4 text-brand-600" />
              Inventário
            </h2>
            <Button size="sm" onClick={abrirNovo}>
              <Plus className="size-3.5" />
              Novo
            </Button>
          </div>
          <Card className="overflow-hidden">
            {equipamentos === null ? (
              <Spinner />
            ) : equipamentos.length === 0 ? (
              <EmptyState icon={<Laptop className="size-6" />} title="Sem equipamentos" />
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {equipamentos.map((eq) => (
                    <tr key={eq.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800">{eq.designacao}</p>
                        <p className="text-xs text-slate-400">{eq.tipo}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={eq.estado === 'operacional' ? 'emerald' : eq.estado === 'avaria' ? 'red' : 'amber'}>
                          {eq.estado}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditando(eq)
                              setTipo(eq.tipo)
                              setDesignacao(eq.designacao)
                              setNrInventario(eq.nr_inventario ?? '')
                              setEstado(eq.estado)
                              setErro(null)
                              setModalAberto(true)
                            }}
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => eliminar(eq.id)}
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
        </div>
      </div>

      <div className="lg:col-span-3">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Utilizações</h2>
        <Card className="overflow-hidden">
          {usos === null ? (
            <Spinner />
          ) : usos.length === 0 ? (
            <EmptyState icon={<Search className="size-6" />} title="Sem registos de utilização" />
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white/95 backdrop-blur">
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Utilizador</th>
                    <th className="px-5 py-3">Equipamento</th>
                    <th className="px-5 py-3">Início</th>
                    <th className="px-5 py-3">Fim</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {usos.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{u.utilizador?.nome ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{u.equipamento?.designacao ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(u.inicio).toLocaleString('pt-PT')}</td>
                      <td className="px-5 py-3.5 text-slate-500">{u.fim ? new Date(u.fim).toLocaleString('pt-PT') : '—'}</td>
                      <td className="px-5 py-3.5">
                        {!u.fim && (
                          <button
                            title="Terminar"
                            onClick={() => terminarUso(u.id)}
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <LogOut className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar equipamento' : 'Novo equipamento'} width="sm">
        <div className="flex flex-col gap-3.5">
          <Field label="Tipo">
            <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="PC / portátil / tablet…" />
          </Field>
          <Field label="Designação">
            <Input value={designacao} onChange={(e) => setDesignacao(e.target.value)} />
          </Field>
          <Field label="Nº de inventário">
            <Input value={nrInventario} onChange={(e) => setNrInventario(e.target.value)} />
          </Field>
          <Field label="Estado">
            <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoEquipamento)}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button loading={aGuardar} disabled={!tipo || !designacao} onClick={guardar}>
            Guardar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
