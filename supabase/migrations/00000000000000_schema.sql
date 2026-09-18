-- =====================================================================
-- Biblioteca Escolar — esquema PostgreSQL (Supabase)
-- Adaptado do desenho original para se integrar com auth.users do
-- Supabase (login Google/Microsoft) e com Row Level Security.
--
-- Convenção: tudo em minúsculas, sem acentos nos identificadores.
-- Nada se apaga: usa-se sempre "ativo" / "estado" e histórico por ano letivo.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- pesquisa sem acentos
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- pesquisa aproximada

-- =====================================================================
-- 1. TIPOS
-- =====================================================================

CREATE TYPE tipo_documento   AS ENUM ('monografia','manual_escolar','periodico','audiovisual','jogo','outro');
CREATE TYPE estado_fisico    AS ENUM ('bom','razoavel','danificado','inutilizado');
CREATE TYPE situacao_exemplar AS ENUM ('disponivel','emprestado','reservado','reparacao','extraviado','abatido');
CREATE TYPE tipo_utilizador  AS ENUM ('aluno','docente','nao_docente','externo','entidade');
CREATE TYPE escalao_ase      AS ENUM ('A','B','C','sem_escalao');
CREATE TYPE tipo_emprestimo  AS ENUM ('domiciliario','presencial','sala_aula','institucional','manual');
CREATE TYPE estado_emprestimo AS ENUM ('ativo','devolvido','atrasado','perdido','danificado');
CREATE TYPE estado_reserva   AS ENUM ('ativa','disponivel','satisfeita','cancelada','expirada');
-- perfil_operador é o papel dentro da aplicação:
--   administrador -> acesso total, gere operadores e parâmetros
--   bibliotecario/assistente/monitor -> operações do dia a dia (empréstimo/devolução/catálogo)
--   consulta -> só leitura, mesmo sendo "operador"
CREATE TYPE perfil_operador  AS ENUM ('administrador','bibliotecario','assistente','monitor','consulta');
CREATE TYPE estado_equipamento AS ENUM ('operacional','avaria','manutencao','abatido');

-- =====================================================================
-- 2. SISTEMA
-- =====================================================================

CREATE TABLE ano_letivo (
    id           serial PRIMARY KEY,
    designacao   text NOT NULL UNIQUE,          -- '2026/2027'
    data_inicio  date NOT NULL,
    data_fim     date NOT NULL,
    ativo        boolean NOT NULL DEFAULT false,
    CHECK (data_fim > data_inicio)
);
CREATE UNIQUE INDEX ux_ano_letivo_ativo ON ano_letivo (ativo) WHERE ativo;

CREATE TABLE calendario_encerramento (
    id            serial PRIMARY KEY,
    ano_letivo_id int NOT NULL REFERENCES ano_letivo(id),
    data_inicio   date NOT NULL,
    data_fim      date NOT NULL,
    descricao     text,
    CHECK (data_fim >= data_inicio)
);

-- Operadores = pessoal com conta na aplicação (login via Supabase Auth).
-- auth_user_id liga-se a auth.users quando a pessoa faz login pela 1ª vez.
-- Um admin pode "pré-criar" a linha só com o email; a ligação a auth_user_id
-- acontece automaticamente no próximo login dessa pessoa (ver trigger mais abaixo).
CREATE TABLE operador (
    id           serial PRIMARY KEY,
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    nome         text NOT NULL,
    email        text NOT NULL UNIQUE,
    perfil       perfil_operador NOT NULL DEFAULT 'consulta',
    ativo        boolean NOT NULL DEFAULT true,
    criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parametro (
    chave     text PRIMARY KEY,
    valor     text NOT NULL,
    descricao text
);

CREATE TABLE log_auditoria (
    id          bigserial PRIMARY KEY,
    operador_id int REFERENCES operador(id),
    tabela      text NOT NULL,
    registo_id  text NOT NULL,
    acao        text NOT NULL,                  -- insert / update / delete
    dados_antes jsonb,
    dados_depois jsonb,
    ocorrido_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_auditoria_tabela ON log_auditoria (tabela, ocorrido_em DESC);

-- =====================================================================
-- 3. CATÁLOGO
-- =====================================================================

CREATE TABLE editora (
    id   serial PRIMARY KEY,
    nome text NOT NULL UNIQUE
);

CREATE TABLE autor (
    id   serial PRIMARY KEY,
    nome text NOT NULL,                          -- 'Saramago, José'
    UNIQUE (nome)
);

CREATE TABLE categoria (
    id        serial PRIMARY KEY,
    designacao text NOT NULL UNIQUE,
    cdu_base  text                               -- ex.: '82' literatura
);

CREATE TABLE disciplina (
    id        serial PRIMARY KEY,
    designacao text NOT NULL UNIQUE,
    codigo    text
);

CREATE TABLE localizacao (
    id        serial PRIMARY KEY,
    sala      text,
    estante   text,
    prateleira text,
    descricao text,
    UNIQUE (sala, estante, prateleira)
);

-- A OBRA é o título. Existe uma vez, tenha 1 ou 40 cópias.
CREATE TABLE obra (
    id               serial PRIMARY KEY,
    tipo             tipo_documento NOT NULL DEFAULT 'monografia',
    titulo           text NOT NULL,
    subtitulo        text,
    editora_id       int REFERENCES editora(id),
    ano_edicao       int CHECK (ano_edicao BETWEEN 1400 AND 2200),
    edicao           text,
    isbn             text,
    issn             text,
    idioma           text DEFAULT 'pt',
    cdu              text,
    categoria_id     int REFERENCES categoria(id),
    nr_paginas       int,
    resumo           text,
    palavras_chave   text[],
    capa_url         text,
    -- específico de manuais escolares:
    disciplina_id    int REFERENCES disciplina(id),
    ano_escolaridade int,
    criado_em        timestamptz NOT NULL DEFAULT now(),
    criado_por       int REFERENCES operador(id)
);
CREATE INDEX ix_obra_isbn ON obra (isbn);
CREATE INDEX ix_obra_titulo_trgm ON obra USING gin (unaccent(titulo) gin_trgm_ops);
CREATE INDEX ix_obra_cdu ON obra (cdu);

CREATE TABLE obra_autor (
    obra_id  int NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
    autor_id int NOT NULL REFERENCES autor(id),
    papel    text DEFAULT 'autor',               -- autor / coordenador / tradutor / ilustrador
    ordem    smallint DEFAULT 1,
    PRIMARY KEY (obra_id, autor_id, papel)
);

-- O EXEMPLAR é a cópia física. É isto que se empresta.
CREATE TABLE exemplar (
    id                 serial PRIMARY KEY,
    obra_id            int NOT NULL REFERENCES obra(id),
    nr_registo         text NOT NULL UNIQUE,     -- nº interno / de inventário
    codigo_barras      text UNIQUE,
    cota               text,
    localizacao_id     int REFERENCES localizacao(id),
    estado_conservacao estado_fisico NOT NULL DEFAULT 'bom',
    situacao           situacao_exemplar NOT NULL DEFAULT 'disponivel',
    emprestavel        boolean NOT NULL DEFAULT true,   -- false = só consulta local
    data_aquisicao     date,
    proveniencia       text,                     -- compra / oferta / Ministério / permuta
    valor              numeric(8,2),
    observacoes        text,
    criado_em          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_exemplar_obra ON exemplar (obra_id);
CREATE INDEX ix_exemplar_situacao ON exemplar (situacao);

-- =====================================================================
-- 4. UTILIZADORES (da biblioteca: alunos, docentes, etc. — distintos dos "operadores")
-- =====================================================================

CREATE TABLE entidade (
    id          serial PRIMARY KEY,
    nome        text NOT NULL,
    tipo        text,                            -- escola / associação / autarquia / empresa
    nif         text,
    morada      text,
    contacto    text,
    responsavel text,
    ativo       boolean NOT NULL DEFAULT true
);

CREATE TABLE curso (
    id         serial PRIMARY KEY,
    designacao text NOT NULL,
    codigo     text,
    ativo      boolean NOT NULL DEFAULT true
);

-- Alunos, docentes, não docentes, externos e entidades: tudo aqui.
-- email é o que liga esta ficha à pessoa quando ela faz login (self-service).
CREATE TABLE utilizador (
    id              serial PRIMARY KEY,
    tipo            tipo_utilizador NOT NULL,
    nome            text NOT NULL,
    nr_interno      text,                        -- nº de aluno / nº mecanográfico
    cartao          text UNIQUE,                 -- código de barras do cartão
    email           text,
    telefone        text,
    nif             text,
    data_nascimento date,
    entidade_id     int REFERENCES entidade(id), -- preenchido quando tipo='entidade' ou 'externo'
    perfil_id       int,                         -- FK adiante
    ativo           boolean NOT NULL DEFAULT true,
    data_inscricao  date NOT NULL DEFAULT current_date,
    observacoes     text,
    UNIQUE (tipo, nr_interno),
    CHECK (tipo <> 'entidade' OR entidade_id IS NOT NULL)
);
CREATE INDEX ix_utilizador_nome_trgm ON utilizador USING gin (unaccent(nome) gin_trgm_ops);
CREATE UNIQUE INDEX ux_utilizador_email ON utilizador (lower(email)) WHERE email IS NOT NULL;

-- Regras de empréstimo. Parametrizáveis, não escritas no código.
CREATE TABLE perfil_emprestimo (
    id              serial PRIMARY KEY,
    designacao      text NOT NULL UNIQUE,
    max_exemplares  smallint NOT NULL DEFAULT 3,
    prazo_dias      smallint NOT NULL DEFAULT 15,
    max_renovacoes  smallint NOT NULL DEFAULT 1,
    permite_reserva boolean NOT NULL DEFAULT true,
    permite_manuais boolean NOT NULL DEFAULT false,
    bloqueia_com_atraso boolean NOT NULL DEFAULT true
);
ALTER TABLE utilizador
    ADD CONSTRAINT fk_utilizador_perfil FOREIGN KEY (perfil_id) REFERENCES perfil_emprestimo(id);

-- HISTÓRICO ESCOLAR: um registo por aluno e por ano letivo.
-- É isto que permite mudar de turma/curso sem perder o histórico.
CREATE TABLE matricula (
    id               serial PRIMARY KEY,
    utilizador_id    int NOT NULL REFERENCES utilizador(id),
    ano_letivo_id    int NOT NULL REFERENCES ano_letivo(id),
    curso_id         int REFERENCES curso(id),
    ano_escolaridade smallint,
    turma            text,
    escalao          escalao_ase NOT NULL DEFAULT 'sem_escalao',
    estado           text NOT NULL DEFAULT 'matriculado',  -- matriculado/transferido/concluiu/anulou
    UNIQUE (utilizador_id, ano_letivo_id)
);
CREATE INDEX ix_matricula_turma ON matricula (ano_letivo_id, turma);

-- =====================================================================
-- 5. CIRCULAÇÃO
-- =====================================================================

CREATE TABLE emprestimo (
    id                     serial PRIMARY KEY,
    exemplar_id            int NOT NULL REFERENCES exemplar(id),
    utilizador_id          int NOT NULL REFERENCES utilizador(id),
    ano_letivo_id          int NOT NULL REFERENCES ano_letivo(id),
    tipo                   tipo_emprestimo NOT NULL DEFAULT 'domiciliario',
    data_emprestimo        date NOT NULL DEFAULT current_date,
    data_prevista_devolucao date NOT NULL,
    data_devolucao         date,
    nr_renovacoes          smallint NOT NULL DEFAULT 0,
    estado                 estado_emprestimo NOT NULL DEFAULT 'ativo',
    operador_id            int REFERENCES operador(id),
    operador_devolucao_id  int REFERENCES operador(id),
    observacoes            text,
    CHECK (data_prevista_devolucao >= data_emprestimo),
    CHECK (data_devolucao IS NULL OR data_devolucao >= data_emprestimo)
);
CREATE UNIQUE INDEX ux_emprestimo_exemplar_aberto
    ON emprestimo (exemplar_id) WHERE data_devolucao IS NULL;
CREATE INDEX ix_emprestimo_utilizador ON emprestimo (utilizador_id, data_emprestimo DESC);
CREATE INDEX ix_emprestimo_abertos ON emprestimo (data_prevista_devolucao) WHERE data_devolucao IS NULL;

CREATE TABLE renovacao (
    id                serial PRIMARY KEY,
    emprestimo_id     int NOT NULL REFERENCES emprestimo(id) ON DELETE CASCADE,
    data              date NOT NULL DEFAULT current_date,
    data_anterior     date NOT NULL,
    nova_data_prevista date NOT NULL,
    operador_id       int REFERENCES operador(id)
);

-- Reserva-se a OBRA, não o exemplar: serve qualquer cópia que apareça.
CREATE TABLE reserva (
    id                      serial PRIMARY KEY,
    obra_id                 int NOT NULL REFERENCES obra(id),
    utilizador_id           int NOT NULL REFERENCES utilizador(id),
    data_reserva            timestamptz NOT NULL DEFAULT now(),
    estado                  estado_reserva NOT NULL DEFAULT 'ativa',
    exemplar_id             int REFERENCES exemplar(id),   -- preenchido quando fica disponível
    data_limite_levantamento date,
    observacoes             text
);
CREATE INDEX ix_reserva_fila ON reserva (obra_id, data_reserva) WHERE estado = 'ativa';

CREATE TABLE ocorrencia (
    id               serial PRIMARY KEY,
    emprestimo_id    int REFERENCES emprestimo(id),
    exemplar_id      int NOT NULL REFERENCES exemplar(id),
    utilizador_id    int REFERENCES utilizador(id),
    tipo             text NOT NULL,              -- dano / perda / atraso_grave
    descricao        text,
    valor_reposicao  numeric(8,2),
    resolvida        boolean NOT NULL DEFAULT false,
    forma_resolucao  text,                       -- substituicao / pagamento / perdao
    data_ocorrencia  date NOT NULL DEFAULT current_date,
    data_resolucao   date
);

CREATE TABLE notificacao (
    id            bigserial PRIMARY KEY,
    utilizador_id int NOT NULL REFERENCES utilizador(id),
    emprestimo_id int REFERENCES emprestimo(id),
    reserva_id    int REFERENCES reserva(id),
    tipo          text NOT NULL,                 -- aviso_previo / atraso / reserva_disponivel
    canal         text NOT NULL DEFAULT 'email',
    assunto       text,
    corpo         text,
    enviada       boolean NOT NULL DEFAULT false,
    data_envio    timestamptz
);

-- =====================================================================
-- 6. MANUAIS ESCOLARES
--    Extensão do empréstimo, só com o que é específico do regime.
-- =====================================================================

CREATE TABLE manual_atribuicao (
    id                serial PRIMARY KEY,
    emprestimo_id     int NOT NULL UNIQUE REFERENCES emprestimo(id) ON DELETE CASCADE,
    matricula_id      int NOT NULL REFERENCES matricula(id),
    disciplina_id     int REFERENCES disciplina(id),
    escalao           escalao_ase NOT NULL DEFAULT 'sem_escalao',
    nr_recibo         text,
    recibo_assinado   boolean NOT NULL DEFAULT false,
    estado_devolucao  estado_fisico,
    fica_com_aluno    boolean NOT NULL DEFAULT false,   -- fim de ciclo
    observacoes       text
);

-- =====================================================================
-- 7. ESPAÇO E EQUIPAMENTOS
-- =====================================================================

CREATE TABLE reserva_espaco (
    id            serial PRIMARY KEY,
    ano_letivo_id int NOT NULL REFERENCES ano_letivo(id),
    data          date NOT NULL,
    hora_inicio   time NOT NULL,
    hora_fim      time NOT NULL,
    docente_id    int NOT NULL REFERENCES utilizador(id),
    turma         text,
    disciplina_id int REFERENCES disciplina(id),
    finalidade    text,
    nr_alunos     smallint,
    estado        text NOT NULL DEFAULT 'confirmada',   -- pedida/confirmada/realizada/cancelada
    CHECK (hora_fim > hora_inicio)
);
CREATE INDEX ix_reserva_espaco_data ON reserva_espaco (data, hora_inicio);

CREATE TABLE frequencia (
    id            bigserial PRIMARY KEY,
    utilizador_id int REFERENCES utilizador(id),   -- NULL = visitante não identificado
    entrada       timestamptz NOT NULL DEFAULT now(),
    saida         timestamptz,
    finalidade    text                             -- leitura/trabalho/computador/aula/jogos/requisicao
);
CREATE INDEX ix_frequencia_entrada ON frequencia (entrada DESC);

CREATE TABLE equipamento (
    id             serial PRIMARY KEY,
    tipo           text NOT NULL,                  -- PC/portátil/tablet/projetor/auscultadores
    designacao     text NOT NULL,
    nr_inventario  text UNIQUE,
    localizacao_id int REFERENCES localizacao(id),
    estado         estado_equipamento NOT NULL DEFAULT 'operacional',
    observacoes    text
);

CREATE TABLE utilizacao_equipamento (
    id             bigserial PRIMARY KEY,
    equipamento_id int NOT NULL REFERENCES equipamento(id),
    utilizador_id  int NOT NULL REFERENCES utilizador(id),
    inicio         timestamptz NOT NULL DEFAULT now(),
    fim            timestamptz,
    finalidade     text,
    ocorrencias    text
);
CREATE UNIQUE INDEX ux_equipamento_em_uso
    ON utilizacao_equipamento (equipamento_id) WHERE fim IS NULL;

-- =====================================================================
-- 8. AUTOMATISMOS
-- =====================================================================

-- Mantém exemplar.situacao coerente com os empréstimos.
CREATE OR REPLACE FUNCTION trg_emprestimo_situacao() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE exemplar SET situacao = 'emprestado' WHERE id = NEW.exemplar_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.data_devolucao IS NOT NULL AND OLD.data_devolucao IS NULL THEN
        UPDATE exemplar
           SET situacao = CASE NEW.estado
                            WHEN 'perdido'    THEN 'extraviado'::situacao_exemplar
                            WHEN 'danificado' THEN 'reparacao'::situacao_exemplar
                            ELSE 'disponivel'::situacao_exemplar
                          END
         WHERE id = NEW.exemplar_id;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_emprestimo_situacao
AFTER INSERT OR UPDATE ON emprestimo
FOR EACH ROW EXECUTE FUNCTION trg_emprestimo_situacao();

-- Prazo de devolução saltando encerramentos da biblioteca.
CREATE OR REPLACE FUNCTION calcula_prazo(p_inicio date, p_dias int, p_ano_letivo int)
RETURNS date AS $$
DECLARE d date := p_inicio + p_dias;
BEGIN
    LOOP
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM calendario_encerramento c
             WHERE c.ano_letivo_id = p_ano_letivo AND d BETWEEN c.data_inicio AND c.data_fim
        ) AND extract(isodow FROM d) < 6;
        d := d + 1;
    END LOOP;
    RETURN d;
END $$ LANGUAGE plpgsql;

-- Marcar atrasos (correr uma vez por dia — ver secção 11, pg_cron)
CREATE OR REPLACE FUNCTION marcar_atrasos() RETURNS int AS $$
DECLARE n int;
BEGIN
    UPDATE emprestimo
       SET estado = 'atrasado'
     WHERE data_devolucao IS NULL
       AND estado = 'ativo'
       AND data_prevista_devolucao < current_date;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$ LANGUAGE plpgsql;

-- =====================================================================
-- 9. INTEGRAÇÃO COM SUPABASE AUTH
-- =====================================================================
-- Quando alguém faz login pela 1ª vez (Google/Microsoft), o Supabase cria
-- uma linha em auth.users. Este trigger:
--   1. Liga automaticamente a uma linha de "operador" pré-criada por um
--      administrador para aquele email (promoção de utilizador comum a
--      operador do dia a dia).
--   2. Garante que o email administrativo definido abaixo é sempre admin,
--      mesmo no primeiro login de sempre (bootstrap).
-- Todos os outros logins ficam sem linha em "operador": são utilizadores
-- validados mas não registados como pessoal — só acesso de leitura ao
-- seu próprio histórico (ver policies RLS mais abaixo).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger AS $$
BEGIN
    UPDATE public.operador
       SET auth_user_id = NEW.id
     WHERE lower(email) = lower(NEW.email) AND auth_user_id IS NULL;

    IF lower(NEW.email) = 'pedro.mf.santos@outlook.pt' THEN
        INSERT INTO public.operador (auth_user_id, nome, email, perfil, ativo)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, 'administrador', true)
        ON CONFLICT (email) DO UPDATE
           SET auth_user_id = EXCLUDED.auth_user_id, perfil = 'administrador', ativo = true;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Helpers usados nas policies (SECURITY DEFINER para evitar recursão de RLS
-- sobre a própria tabela "operador").
CREATE OR REPLACE FUNCTION public.current_email() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(nullif(auth.jwt() ->> 'email', ''))
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operador
     WHERE auth_user_id = auth.uid() AND perfil = 'administrador' AND ativo
  )
$$;

-- "utilizador" no sentido do pedido do cliente: pessoal que faz o dia a
-- dia (empréstimo/devolução/catálogo). Inclui o administrador.
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operador
     WHERE auth_user_id = auth.uid() AND ativo AND perfil <> 'consulta'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_operador() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operador WHERE auth_user_id = auth.uid() AND ativo
  )
$$;

-- =====================================================================
-- 10. VISTAS (o "cruzamento de dados" pedido)
-- =====================================================================

CREATE VIEW v_disponibilidade AS
SELECT o.id AS obra_id,
       o.titulo,
       o.tipo,
       count(e.id)                                             AS total_exemplares,
       count(*) FILTER (WHERE e.situacao = 'disponivel')        AS disponiveis,
       count(*) FILTER (WHERE e.situacao = 'emprestado')        AS emprestados,
       count(*) FILTER (WHERE e.situacao IN ('reparacao','extraviado','abatido')) AS indisponiveis
  FROM obra o
  LEFT JOIN exemplar e ON e.obra_id = o.id
 GROUP BY o.id, o.titulo, o.tipo;

CREATE VIEW v_emprestimos_ativos AS
SELECT em.id, u.nome AS utilizador, u.tipo AS tipo_utilizador, u.email AS utilizador_email,
       m.turma, o.titulo, ex.nr_registo, ex.cota,
       em.data_emprestimo, em.data_prevista_devolucao,
       (current_date - em.data_prevista_devolucao) AS dias_atraso
  FROM emprestimo em
  JOIN utilizador u ON u.id = em.utilizador_id
  JOIN exemplar  ex ON ex.id = em.exemplar_id
  JOIN obra       o ON o.id = ex.obra_id
  LEFT JOIN matricula m ON m.utilizador_id = u.id AND m.ano_letivo_id = em.ano_letivo_id
 WHERE em.data_devolucao IS NULL;

CREATE VIEW v_utilizadores_com_pendencias AS
SELECT u.id, u.nome, u.tipo, u.email, count(*) AS exemplares_em_falta,
       min(em.data_prevista_devolucao) AS mais_antigo
  FROM emprestimo em
  JOIN utilizador u ON u.id = em.utilizador_id
 WHERE em.data_devolucao IS NULL
   AND em.data_prevista_devolucao < current_date
 GROUP BY u.id, u.nome, u.tipo, u.email;

-- =====================================================================
-- 11. ROW LEVEL SECURITY
--   admin       -> tudo
--   staff       -> operações do dia a dia (catálogo, circulação, utilizadores)
--   autenticado sem linha "operador" -> só lê o que é seu (por email)
-- =====================================================================

ALTER TABLE ano_letivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_encerramento ENABLE ROW LEVEL SECURITY;
ALTER TABLE operador ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametro ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE editora ENABLE ROW LEVEL SECURITY;
ALTER TABLE autor ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplina ENABLE ROW LEVEL SECURITY;
ALTER TABLE localizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_autor ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplar ENABLE ROW LEVEL SECURITY;
ALTER TABLE entidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE curso ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizador ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_emprestimo ENABLE ROW LEVEL SECURITY;
ALTER TABLE matricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimo ENABLE ROW LEVEL SECURITY;
ALTER TABLE renovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_atribuicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva_espaco ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizacao_equipamento ENABLE ROW LEVEL SECURITY;

-- --- sistema: estrutural, gerido pelo admin, lido por qualquer operador ---
CREATE POLICY sel_ano_letivo ON ano_letivo FOR SELECT USING (public.is_operador());
CREATE POLICY wr_ano_letivo ON ano_letivo FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY sel_calendario ON calendario_encerramento FOR SELECT USING (public.is_operador());
CREATE POLICY wr_calendario ON calendario_encerramento FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY sel_parametro ON parametro FOR SELECT USING (public.is_operador());
CREATE POLICY wr_parametro ON parametro FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY sel_auditoria ON log_auditoria FOR SELECT USING (public.is_admin());

-- --- operadores: cada um vê a sua ficha; admin gere todas ---
CREATE POLICY sel_operador ON operador FOR SELECT USING (auth_user_id = auth.uid() OR public.is_admin());
CREATE POLICY wr_operador ON operador FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- catálogo: leitura para qualquer autenticado, escrita para staff ---
CREATE POLICY sel_editora ON editora FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_editora ON editora FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_autor ON autor FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_autor ON autor FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_categoria ON categoria FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_categoria ON categoria FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_disciplina ON disciplina FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_disciplina ON disciplina FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_localizacao ON localizacao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_localizacao ON localizacao FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_obra ON obra FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_obra ON obra FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_obra_autor ON obra_autor FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_obra_autor ON obra_autor FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_exemplar ON exemplar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_exemplar ON exemplar FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- --- entidades/cursos: geridos pelo staff ---
CREATE POLICY sel_entidade ON entidade FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_entidade ON entidade FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_curso ON curso FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_curso ON curso FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_perfil_emprestimo ON perfil_emprestimo FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_perfil_emprestimo ON perfil_emprestimo FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- utilizador: staff vê/gere tudo; qualquer autenticado vê só a sua ficha (por email) ---
CREATE POLICY sel_utilizador ON utilizador FOR SELECT
  USING (public.is_staff() OR lower(email) = public.current_email());
CREATE POLICY wr_utilizador ON utilizador FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- --- matrícula: idem, self-service via join a utilizador ---
CREATE POLICY sel_matricula ON matricula FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = matricula.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_matricula ON matricula FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- --- circulação: staff gere; utilizador final só lê o que é seu ---
CREATE POLICY sel_emprestimo ON emprestimo FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = emprestimo.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_emprestimo ON emprestimo FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_renovacao ON renovacao FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM emprestimo em JOIN utilizador u ON u.id = em.utilizador_id
     WHERE em.id = renovacao.emprestimo_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_renovacao ON renovacao FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_reserva ON reserva FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = reserva.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_reserva ON reserva FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_ocorrencia ON ocorrencia FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = ocorrencia.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_ocorrencia ON ocorrencia FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_notificacao ON notificacao FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = notificacao.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_notificacao ON notificacao FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_manual_atribuicao ON manual_atribuicao FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM emprestimo em JOIN utilizador u ON u.id = em.utilizador_id
     WHERE em.id = manual_atribuicao.emprestimo_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_manual_atribuicao ON manual_atribuicao FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- --- espaço e equipamentos ---
CREATE POLICY sel_reserva_espaco ON reserva_espaco FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = reserva_espaco.docente_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_reserva_espaco ON reserva_espaco FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_frequencia ON frequencia FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = frequencia.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_frequencia ON frequencia FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_equipamento ON equipamento FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY wr_equipamento ON equipamento FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY sel_utilizacao_equipamento ON utilizacao_equipamento FOR SELECT USING (
  public.is_staff() OR EXISTS (
    SELECT 1 FROM utilizador u WHERE u.id = utilizacao_equipamento.utilizador_id AND lower(u.email) = public.current_email()
  )
);
CREATE POLICY wr_utilizacao_equipamento ON utilizacao_equipamento FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- =====================================================================
-- 12. DADOS INICIAIS
-- =====================================================================

INSERT INTO perfil_emprestimo (designacao, max_exemplares, prazo_dias, max_renovacoes, permite_manuais) VALUES
 ('Aluno',          3, 15, 1, true),
 ('Docente',       10, 30, 3, false),
 ('Não docente',    5, 30, 2, false),
 ('Externo',        2, 15, 0, false),
 ('Entidade',      30, 90, 2, false);

INSERT INTO parametro (chave, valor, descricao) VALUES
 ('dias_aviso_previo', '2',  'Dias antes do fim do prazo para enviar aviso'),
 ('dias_levantamento_reserva', '3', 'Dias para levantar uma reserva disponível'),
 ('nome_biblioteca', 'Biblioteca Escolar', 'Nome a mostrar nos comprovativos');

-- Bootstrap: garante que o administrador definido já existe como operador
-- mesmo antes do primeiro login (fica ligado a auth_user_id automaticamente
-- quando essa pessoa entrar pela primeira vez, via trigger acima).
INSERT INTO operador (nome, email, perfil, ativo) VALUES
 ('Pedro Santos', 'pedro.mf.santos@outlook.pt', 'administrador', true)
ON CONFLICT (email) DO NOTHING;
