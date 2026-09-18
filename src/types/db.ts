export type PerfilOperador = 'administrador' | 'bibliotecario' | 'assistente' | 'monitor' | 'consulta'
export type TipoUtilizador = 'aluno' | 'docente' | 'nao_docente' | 'externo' | 'entidade'
export type SituacaoExemplar = 'disponivel' | 'emprestado' | 'reservado' | 'reparacao' | 'extraviado' | 'abatido'
export type EstadoFisico = 'bom' | 'razoavel' | 'danificado' | 'inutilizado'
export type TipoDocumento = 'monografia' | 'manual_escolar' | 'periodico' | 'audiovisual' | 'jogo' | 'outro'
export type EscalaoAse = 'sem_escalao' | 'A' | 'B' | 'C'
export type EstadoEquipamento = 'operacional' | 'avaria' | 'manutencao' | 'abatido'

export interface Operador {
  id: number
  auth_user_id: string | null
  nome: string
  email: string
  perfil: PerfilOperador
  ativo: boolean
  criado_em: string
}

export interface Utilizador {
  id: number
  tipo: TipoUtilizador
  nome: string
  nr_interno: string | null
  cartao: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
  data_inscricao: string
  observacoes: string | null
}

export interface Obra {
  id: number
  tipo: TipoDocumento
  titulo: string
  subtitulo: string | null
  ano_edicao: number | null
  isbn: string | null
  cdu: string | null
  categoria_id: number | null
  editora_id: number | null
  resumo: string | null
}

export interface Exemplar {
  id: number
  obra_id: number
  nr_registo: string
  codigo_barras: string | null
  cota: string | null
  estado_conservacao: EstadoFisico
  situacao: SituacaoExemplar
  emprestavel: boolean
}

export interface Emprestimo {
  id: number
  exemplar_id: number
  utilizador_id: number
  ano_letivo_id: number
  data_emprestimo: string
  data_prevista_devolucao: string
  data_devolucao: string | null
  nr_renovacoes: number
  estado: string
  observacoes: string | null
}

export interface Disponibilidade {
  obra_id: number
  titulo: string
  tipo: TipoDocumento
  total_exemplares: number
  disponiveis: number
  emprestados: number
  indisponiveis: number
}

export interface EmprestimoAtivoView {
  id: number
  utilizador: string
  tipo_utilizador: TipoUtilizador
  utilizador_email: string | null
  turma: string | null
  titulo: string
  nr_registo: string
  cota: string | null
  data_emprestimo: string
  data_prevista_devolucao: string
  dias_atraso: number
}
