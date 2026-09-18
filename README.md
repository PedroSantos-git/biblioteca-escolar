# Biblioteca Escolar

Aplicação web de gestão de biblioteca escolar: catálogo, exemplares,
utilizadores (alunos, docentes, não docentes, externos, entidades),
empréstimos/devoluções e manuais escolares.

Stack: React + Vite + TypeScript + Tailwind, com Supabase (Postgres +
Auth + Row Level Security) e deploy na Vercel.

## Perfis de acesso

- **Administrador** — acesso total, incluindo gestão de operadores e
  parâmetros (`operador.perfil = 'administrador'`).
- **Utilizador (staff)** — operações do dia a dia: catálogo, empréstimo,
  devolução, gestão de utilizadores (`operador.perfil` em
  `bibliotecario` / `assistente` / `monitor`).
- **Visitante autenticado** — qualquer pessoa que faça login e não
  tenha uma linha em `operador`: só vê o seu próprio histórico (por
  email), sem acesso de escrita.

Um administrador promove alguém a "utilizador" (staff) criando uma
linha em `operador` com o email dessa pessoa, em **Administração**; a
ligação à conta de login torna-se efetiva assim que essa pessoa entra
pela primeira vez.

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencher com o URL e a anon key do projeto Supabase
npm run dev
```

## Base de dados (Supabase)

O esquema completo (tabelas, RLS, triggers, vistas) está em
[`supabase/migrations`](supabase/migrations). Para aplicar a um
projeto Supabase:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Login Google / Microsoft

Configurar em Supabase → **Authentication → Providers**:

- **Google**: criar credenciais OAuth 2.0 em
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
  tipo "Web application", com o redirect URI que o Supabase indica no
  próprio painel do provider.
- **Microsoft (Azure)**: registar uma app em
  [Azure Portal → Entra ID → App registrations](https://portal.azure.com),
  com o mesmo redirect URI indicado pelo Supabase.

Depois colar Client ID + Client Secret de cada um no painel do
Supabase e ativar o provider.

## Deploy (Vercel)

1. Importar este repositório em [vercel.com/new](https://vercel.com/new)
   (framework detetado automaticamente: Vite).
2. Definir as variáveis de ambiente do projeto na Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. A partir daí, cada `git push` para `main` dispara um novo deploy.
