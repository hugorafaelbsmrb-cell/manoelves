
## Resumo

9 ajustes em telas existentes + 1 tabela nova (janelas de plano) + 1 bucket de storage (fotos de produtos). Sem mexer em auth nem em RLS de tabelas existentes.

---

## 1. Dashboard com filtros de período

Em `src/routes/dashboard.tsx`, adicionar seletor no topo: **7 dias · 14 dias · 30 dias · Mês atual · Mês anterior · 3 meses · Personalizado** (com 2 date pickers).

- A query recalcula `payments` e `appointments` com `gte/lte` dinâmicos.
- O gráfico passa a se chamar "Últimos N dias" e a granularidade do bucket muda: ≤30 dias = diário; >30 dias = semanal.
- KPIs (faturamento, comandas, ticket, margem) e ranking de barbeiros respeitam o período.
- Estado salvo em `localStorage` para persistir entre visitas.

---

## 2. Link "Área do cliente"

`src/routes/index.tsx` (landing) e `src/components/app-shell.tsx` (header logado) já têm pontos prontos; adicionar `<Link to="/cliente">` visível no topo + no rodapé do hero. Também botão "Já sou cliente" na própria `/login` aba "Sou cliente" (atalho para `/cliente` quando o token já existe em `localStorage`).

---

## 3. Agendamento avulso: busca de cliente + confirmação

Em `src/components/manual-booking-wizard.tsx`, passo `"client"` ganha:

- **Combobox de busca** (usa `Command` do shadcn) consultando `appointments` agrupados por `client_whatsapp` (DISTINCT por telefone, ordenado pelo `created_at` mais recente). Digitar nome OU telefone filtra.
- Se nenhum match → botão **"Cadastrar novo cliente"** abre um mini-form inline com nome + WhatsApp.
- Ao confirmar o agendamento, chamar `sendBookingConfirmation({ appointmentId })` (já existe em `uazapi.functions.ts`) automaticamente, mostrando toast "Cliente notificado por WhatsApp" ou warning se falhar.

---

## 4. Multi-serviço no agendamento

Tanto no wizard manual (`manual-booking-wizard.tsx`) quanto no booking público (`src/routes/$slug_.agendar.tsx`):

- Passo "serviço" vira **seleção múltipla** (checkboxes); soma `duration_minutes` e `price_cents`.
- Cálculo de slots usa a soma das durações.
- Insere `appointments` com `total_cents = soma` e cria **um `appointment_items` por serviço**.
- Mensagem de confirmação lista todos os serviços.

---

## 5. Janelas exclusivas por plano de assinatura

**Nova tabela `subscription_plan_windows`**:

```text
id uuid pk
plan_id uuid -> subscription_plans(id) on delete cascade
barber_id uuid null (null = qualquer barbeiro)
weekday int (0-6)
start_time time
end_time time
```

RLS: leitura pública (precisamos filtrar slots no booking), escrita só `owner`.

Em **`/assinaturas`**, dentro do `PlansManager`, cada plano ganha um botão "Agenda exclusiva" abrindo Dialog com grade semanal (mesmo padrão do `barbeiros.tsx`) para adicionar/remover janelas.

No booking público (`$slug_.agendar.tsx`):

- Se o cliente está logado como assinante (telefone bate com `subscriptions.is_active` e tem créditos), **só** slots dentro das janelas do plano dele aparecem.
- Se não tem assinatura ativa, slots **dentro** dessas janelas são escondidos (reservados para assinantes).

---

## 6. Múltiplos intervalos por dia (horários do barbeiro)

`src/routes/barbeiros.tsx` hoje renderiza um bloco por weekday. A tabela `working_hours` já suporta múltiplas linhas por `weekday` (sem unique constraint). UI:

- Cada dia mostra **lista de intervalos** com botão "+ adicionar intervalo" (ex: 09:00-12:00 e 14:00-18:00).
- Cada linha tem botão remover.
- O cálculo de slots no booking já itera `windows.filter(w => w.weekday === wd)`, então funciona sem mudança no engine.

---

## 7. Busca de clientes existentes em /assinaturas

No form "Nova assinatura" do `assinaturas.tsx`, substituir os 2 inputs por **um Combobox** que busca por nome/telefone em `appointments` (mesma fonte da seção 3) e auto-preenche nome+WhatsApp. Mantém opção "Digitar novo cliente".

---

## 8. Wizard de criação de assinatura + envio Pix/Cartão

Refatorar a criação para um **Dialog wizard** de 3 passos:

1. **Cliente** — busca (ver §7) ou cadastro novo.
2. **Plano** — lista de cards dos planos ativos com preço/créditos.
3. **Pagamento** — gera **dois** links automaticamente:
   - `init_point` do Mercado Pago (cartão recorrente, já existe `createSubscriptionPreapproval`).
   - Pix copia-e-cola do 1º mês (nova server fn `createSubscriptionFirstPix` que reusa `createOrderPix` adaptado).

Server fn nova `sendSubscriptionLinksWhatsApp({ subscriptionId })`:
- Usa `uazapi /send/menu` com 2 botões: "💳 Assinar com cartão" (url:) e "📱 Pagar primeiro mês no Pix" (copy:).
- Mensagem: "Olá {nome}! Sua assinatura *{plano}* na {shop}. Escolha a forma de ativar:"
- Fallback texto se o /send/menu falhar (igual ao padrão de `sendOrderPixWhatsApp`).

Botão final no wizard: "Criar e enviar no WhatsApp".

---

## 9. Fotos no catálogo de produtos

- Migration: adicionar coluna `image_url text` em `products`; criar bucket público `products` com policies (leitura pública, escrita só owner).
- Em `src/routes/produtos.tsx`:
  - Form de cadastro ganha input file (upload via `supabase.storage.from('products').upload`).
  - Tabela ganha coluna com thumbnail 48×48.
  - Botão "trocar foto" em cada linha.
- Em `src/routes/cliente.tsx` (loja vitrine) e em telas que listam produtos: passar a exibir `image_url` quando existir.

---

## Detalhes técnicos

- **Storage bucket `products`**: público para leitura; upload restrito por policy a `has_role(auth.uid(),'owner')`.
- **Reaproveitamento**: o engine de slots já trata múltiplos `windows` por dia → §6 é apenas UI.
- **Busca de clientes** (§3 e §7): nova helper `src/lib/clients.ts` que faz `select distinct on (client_whatsapp) client_name, client_whatsapp from appointments order by client_whatsapp, created_at desc limit 50` via RPC ou query Supabase com agrupamento client-side (mais simples). Reutilizada nas duas telas.
- **Filtro de janela exclusiva** (§5): novo helper em `$slug_.agendar.tsx` que, dado o telefone do cliente, busca assinatura ativa e cruza com `subscription_plan_windows` para decidir se um slot é permitido / restrito.
- **Wizard MP+Pix** (§8): a server fn de Pix gera um `orders` "ghost" só para emitir o QR; alternativa mais limpa é nova tabela `subscription_payments` — mas para ficar enxuto vou reutilizar `orders` com `appointment_id=null` e flag implícita pelo `client_name`/total.
- **Sem mudanças em RLS** das tabelas atuais.

## Fora do escopo

- Histórico de pagamentos da assinatura por mês (só renovação atual).
- Edição de janela exclusiva em lote.
- Galeria com múltiplas fotos por produto (uma foto principal).
