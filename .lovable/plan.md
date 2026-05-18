
# Barbearia Mano Elves — MVP completo (Supabase)

Backend via **Supabase** (Postgres + Auth + RLS) em vez de Lovable Cloud. Quando você aprovar este plano, eu habilito a integração Supabase, crio o schema com migrations, faço seed e construo as telas na ordem abaixo.

## Identidade visual
- Preto/branco, **branco predominante** nos painéis internos.
- **Landing pública do cliente em tema escuro** (mobile-first).
- Heading display (Bebas Neue) + corpo Inter. Tokens em `src/styles.css` (oklch).

## Schema (migrations Supabase)
- `barbershop` (dados da barbearia)
- `profiles` (id = auth.users; nome, foto, bio, slug, telefone)
- `app_role` enum (`owner`, `barber`) + `user_roles` + função `has_role` (SECURITY DEFINER)
- `services`, `combos`, `combo_services`
- `working_hours`, `time_off`, `buffer_settings`
- `appointments`, `appointment_items`
- `products`, `product_usage`
- `orders`, `order_items`
- `commission_rules`, `payments` (com `valor_dono`/`valor_barbeiro`)
- `subscriptions` (clube mensal)
- `waitlist`
- `messages_log` (WhatsApp mock)

RLS em todas as tabelas: dono enxerga tudo; barbeiro só suas linhas (`barber_id = auth.uid()`).

## Rotas

**Públicas (dark, mobile-first)**
- `/` — Barbearia Mano Elves + lista de barbeiros
- `/b/$slug` — landing do barbeiro (foto, bio, combos, CTA agendar)
- `/b/$slug/agendar` — combo → calendário → slot (com buffer) → nome/WhatsApp → Pix mock (copia-e-cola + botão "Simular pagamento aprovado") → confirmação

**Autenticadas (light)**
- `/login`
- `/_authenticated/agenda` — calendário drag-and-drop (dnd-kit). Barbeiro vê só a dele.
- `/_authenticated/comanda` — abre comanda do atendimento em andamento, adiciona produtos/bebidas, fecha PDV (Pix/Cartão mock) → mostra split e "NFS-e emitida" (mock)
- `/_authenticated/dashboard` (dono) — BI: faturamento, ticket médio, ocupação por cadeira, ranking
- `/_authenticated/meu-financeiro` (barbeiro) — dashboard isolado
- `/_authenticated/servicos`, `/produtos`, `/barbeiros`, `/assinaturas`, `/fila-espera`, `/reengajamento`, `/configuracoes`

## Lógica chave
- **Slots disponíveis:** duração do combo + buffer, respeitando `working_hours`, `time_off` e agendamentos confirmados.
- **Pix:** se "Proteção No-Show" ligada → `pending_payment` até clique no botão simular.
- **Notificações:** grava em `messages_log`, exibe toast "WhatsApp enviado (simulado)". Lembretes 24h/2h gerados ao confirmar.
- **Split mock:** ao fechar PDV, calcula comissão e grava `payments.valor_dono` / `valor_barbeiro`.
- **NFS-e mock:** badge com número fictício.
- **Assinatura:** debita crédito ao agendar; botão manual "rodar cobrança do mês".
- **Waitlist:** botão "Notificar próximo" ao cancelar.
- **Reengajamento:** lista clientes 45+ dias inativos + disparo manual.

## Stack
TanStack Start + Supabase JS, `dnd-kit`, `date-fns`, `recharts`, `zod`, `react-hook-form`, `sonner`. Auth: email/senha. Primeiro usuário vira `owner` automaticamente.

## Ordem de entrega (mesma branch)
1. Habilitar Supabase + schema + RLS + seed (dono + 2 barbeiros + combos exemplo).
2. Landing pública + fluxo de agendamento + Pix mock.
3. Agenda drag-and-drop + painel do barbeiro.
4. PDV/comanda + estoque + fechamento com split + NFS-e mock.
5. Dashboards (dono e barbeiro) + recharts.
6. Assinaturas, waitlist, reengajamento, log de mensagens.

Pix, WhatsApp, NFS-e, split e cobrança recorrente ficam como **simulação visual** com `// TODO: integrar provedor`, prontos para plugar Mercado Pago / Z-API / NFE.io / Asaas depois.

Aprove para eu começar pela etapa 1.
