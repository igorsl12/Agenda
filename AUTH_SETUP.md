# Configuração de autenticação (Neon + Google)

Este projeto ganhou um backend de autenticação custom rodando nas funções
serverless da Vercel (pasta `api/auth/`), com banco Postgres no Neon.

Esta é a **fase 1** (backend de auth). As telas de login e a migração dos
compromissos para o banco vêm em seguida. Siga os passos abaixo para deixar o
backend pronto e testável.

## 1. Criar o banco Neon

1. No painel da Vercel → seu projeto → aba **Storage** → **Create Database** →
   **Neon** (ou crie em [neon.tech](https://neon.tech) e conecte).
2. A Vercel injeta automaticamente a variável `DATABASE_URL` no projeto.
   - Se criar fora da Vercel, copie a connection string e adicione manualmente
     em **Settings → Environment Variables** como `DATABASE_URL`.

## 2. Rodar o schema

No console do Neon (**SQL Editor**), cole e execute todo o conteúdo de
[`db/schema.sql`](db/schema.sql). É idempotente — pode rodar de novo sem quebrar.

## 3. Criar as credenciais do Google (login social)

1. [Google Cloud Console](https://console.cloud.google.com/) → crie um projeto.
2. **APIs & Services → OAuth consent screen**: configure (tipo External, nome
   do app, seu email). Em produção, publique a tela de consentimento.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo: **Web application**.
   - **Authorized redirect URIs**: adicione
     `https://SEU-APP.vercel.app/api/auth/google/callback`
     (e, para testar local com `vercel dev`, `http://localhost:3000/api/auth/google/callback`).
4. Copie o **Client ID** e o **Client Secret**.

## 4. Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Valor | Observação |
|---|---|---|
| `DATABASE_URL` | connection string do Neon | Injetada automaticamente se criar via painel |
| `GOOGLE_CLIENT_ID` | Client ID do passo 3 | |
| `GOOGLE_CLIENT_SECRET` | Client Secret do passo 3 | **Segredo** — nunca com prefixo `EXPO_PUBLIC` |
| `APP_URL` | `https://SEU-APP.vercel.app` | Opcional. Se omitido, é derivado do host da requisição |

> ⚠️ Nenhuma dessas leva o prefixo `EXPO_PUBLIC_` — são segredos do servidor e
> **não** podem ir para o bundle do app.

Depois de setar, faça um **Redeploy**.

## 5. Testar o backend (via curl ou Thunder/Postman)

```bash
BASE=https://SEU-APP.vercel.app

# cadastro
curl -i -X POST $BASE/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@exemplo.com","password":"senha12345","name":"Teste"}'
# → 201 { user, token } + cabeçalho Set-Cookie: agenda_session=...

# login
curl -i -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@exemplo.com","password":"senha12345"}'
# → 200 { user, token }

# quem sou eu (com o token devolvido acima)
curl -s $BASE/api/auth/me -H "Authorization: Bearer <TOKEN>"
# → { user: { id, email, name } }

# login com Google: abra no navegador
#   $BASE/api/auth/google/start
```

## Endpoints disponíveis

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/signup` | Cadastro email/senha → sessão |
| POST | `/api/auth/login` | Login email/senha → sessão |
| POST | `/api/auth/logout` | Encerra a sessão |
| GET | `/api/auth/me` | Usuário logado (ou 401) |
| GET | `/api/auth/google/start` | Inicia o login com Google |
| GET | `/api/auth/google/callback` | Retorno do Google (uso interno) |

## Notas de segurança

- Senhas: hash **scrypt** (node:crypto) com salt aleatório por usuário e
  comparação em tempo constante. Nunca guardamos a senha em texto puro.
- Sessões: token opaco de 256 bits; o banco guarda só o **hash sha256** do
  token, então um vazamento do banco não expõe sessões utilizáveis.
- Cookie de sessão: `HttpOnly` + `Secure` + `SameSite=Lax` (mitiga XSS e CSRF).
- Login errado devolve a mesma mensagem para email inexistente e senha errada
  (não revela quais emails estão cadastrados).
- O proxy de IA (`/api/extract`) ainda **não** exige login — isso entra na fase
  em que o cliente passa a mandar a sessão. Até lá, use `PROXY_AUTH_TOKEN`.
