
## Objetivo

Criar área do cliente acessada pela mesma tela `/login`, autenticada apenas com número de telefone + código OTP enviado por WhatsApp (uazapi). Sem senha, sem conta no Supabase Auth.

## Mudanças

### 1. Banco de dados (migration)
Nova tabela `client_otp_codes`:
- `phone` (text, normalizado com DDI), `code_hash` (text), `expires_at` (timestamptz), `attempts` (int), `created_at`.
- RLS: nada para o público; acesso só via service role (server functions).
- Função `cleanup_expired_otp()` opcional para limpeza.

### 2. Server functions (`src/lib/client-auth.functions.ts`)
Tudo público (sem `requireSupabaseAuth`), validado por Zod:
- `requestClientOtp({ phone })` — gera código 6 dígitos, salva hash (bcrypt-like via `crypto`), envia via `uazapi /send/text`. Rate-limit simples (máx 1 a cada 60s por número).
- `verifyClientOtp({ phone, code })` — confere hash + expiração (10 min) + tentativas (máx 5). Retorna token de sessão assinado (HMAC com `SUPABASE_SERVICE_ROLE_KEY` como segredo) contendo `{ phone, exp }`. Token guardado em `localStorage` no cliente.
- `getClientPortalData({ token })` — valida token e devolve:
  - dados do cliente (nome derivado do último appointment),
  - agendamentos futuros e passados (`appointments` por `client_whatsapp`),
  - assinatura ativa + créditos (`subscriptions`),
  - lista de produtos ativos (`products` onde `is_active` e `not is_internal_use`).
- `cancelClientAppointment({ token, appointmentId })` — só cancela se telefone do appointment bate com token e `start_at` no futuro.

### 3. Tela `/login` (`src/routes/login.tsx`)
Adicionar tabs no topo: **Sou cliente** / **Equipe**.
- Aba "Sou cliente": input telefone → "Enviar código" → input do código → "Entrar". Sucesso → `navigate({ to: "/cliente" })`.
- Aba "Equipe": fluxo atual de e-mail+senha.

### 4. Nova rota `/cliente` (`src/routes/cliente.tsx`)
Rota pública (sem `_authenticated`, já que não usa Supabase Auth). No `useEffect`, lê token de `localStorage` e chama `getClientPortalData`; se inválido, redireciona para `/login`. Layout em cards:
1. **Cabeçalho**: olá {nome}, botão "Sair" (limpa token).
2. **Minha assinatura**: plano, créditos restantes, próxima cobrança; se não tiver, botão "Ver planos" → `/`.
3. **Próximo horário** + lista de futuros (com botão Cancelar). Botão "Agendar novo horário" → leva para `/{slug-do-barbeiro}/agendar` (último barbeiro usado) ou tela de seleção.
4. **Histórico** colapsável.
5. **Loja de conveniência**: grid de produtos com foto/nome/preço (vitrine apenas — texto "Peça no balcão"). Sem checkout.

### 5. Navegação
- Em `src/routes/index.tsx` (landing) e no `__root.tsx`, adicionar link "Área do cliente" → `/login` (ou `/cliente` se já logado).
- Sem mudanças no `app-shell` (esse é só para equipe).

## Detalhes técnicos

- Normalização do telefone reusa `normalizeNumber` do `uazapi.functions.ts` — extrair para `src/lib/phone.ts` e importar nos dois lugares.
- Token de cliente: payload base64 + HMAC-SHA256 (segredo = `SUPABASE_SERVICE_ROLE_KEY`), expiração 30 dias.
- Mensagem OTP: `"Seu código de acesso na {shop}: *123456*. Válido por 10 minutos."`.
- `client.phone` é derivado de `appointments.client_whatsapp` — não existe tabela de clientes; o portal funciona para qualquer telefone que tenha pelo menos 1 agendamento ou assinatura registrada. Se nenhum match, mostrar mensagem "Não encontramos cadastro" + botão para agendar pela primeira vez.

## Fora do escopo (não vou mexer)
- Checkout/Pix na loja.
- Cadastro independente do cliente (perfil editável).
- Programa de fidelidade.
