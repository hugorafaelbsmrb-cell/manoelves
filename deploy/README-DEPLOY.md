# Deploy do Mano Elves na VPS (Ubuntu)

Guia completo para migrar o app (TanStack Start + Supabase, criado no Lovable)
para uma VPS Ubuntu com 4 GB+ de RAM. Sem domínio por enquanto: o app responde
em `http://IP_DA_VPS` e o Supabase em `http://IP_DA_VPS:8000`.

## Arquitetura

```
Internet
  ├─ :80   → Caddy → app Node (PM2) na porta 3001
  ├─ :8000 → Kong do Supabase (REST/Auth/Storage)
  └─ :3100 → Supabase Studio (painel)
Supabase em Docker (compose oficial supabase/docker) — Postgres 5432 interno
```

## Pré-requisitos

- VPS Ubuntu 22.04/24.04, 4 GB+ RAM, 40 GB+ disco, acesso root via SSH
- Os arquivos desta pasta `deploy/` e o pacote `vps-migration/` (schema + dados)

---

## Etapa 0 — Acesso à VPS

```bash
ssh root@IP_DA_VPS
free -h && df -h /   # conferir RAM e disco
```

## Etapa 1 — Provisionar a VPS

Copie `setup-vps.sh` para a VPS e rode:

```bash
# na sua máquina:
scp deploy/setup-vps.sh root@IP_DA_VPS:/root/

# na VPS:
sudo bash /root/setup-vps.sh
newgrp docker           # ou reconecte o SSH
```

Instala: Docker + Compose, Node 20 LTS, PM2, Caddy, psql e o firewall (UFW)
com portas 22, 80, 8000 e 3100 abertas.

## Etapa 2 — Subir o Supabase self-hosted

```bash
# na VPS:
mkdir -p /opt/supabase && cd /opt/supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

Preencha o `.env` (use `deploy/supabase.env.example` como referência):

1. `POSTGRES_PASSWORD` → `openssl rand -hex 16`
2. `JWT_SECRET` → `openssl rand -hex 32`
3. Gere as chaves **na sua máquina** (com o JWT_SECRET gerado):
   ```bash
   node deploy/generate-jwt-keys.mjs "COLE_AQUI_O_JWT_SECRET"
   ```
   Cole a saída em `ANON_KEY` e `SERVICE_ROLE_KEY` do `.env`.
4. `API_EXTERNAL_URL=http://IP_DA_VPS:8000`
5. `SITE_URL=http://IP_DA_VPS`
6. `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` (login do Studio)
7. `STUDIO_PORT=3100`

Suba os serviços:

```bash
docker compose pull
docker compose up -d
```

Valide o Studio em `http://IP_DA_VPS:3100`. Se algo não subir:
`docker compose ps` e `docker compose logs -f <serviço>`.

## Etapa 3 — Aplicar schema e migrar os dados

1. Copie o pacote `vps-migration/` para a VPS e aplique as migrations:
   ```bash
   # na sua máquina:
   scp -r vps-migration root@IP_DA_VPS:/opt/supabase/

   # na VPS:
   cd /opt/supabase/vps-migration
   export DATABASE_URL="postgresql://postgres:SUA_POSTGRES_PASSWORD@127.0.0.1:5432/postgres"
   chmod +x apply-migrations.sh
   ./apply-migrations.sh
   ```
   Isso cria as tabelas, políticas RLS, buckets de storage (`products`,
   `avatars`, `signage`) e as extensões `pg_cron` e `pg_net`.

2. **Exportar os dados do Lovable** (painel Lovable → Cloud → Configurações
   avançadas → Exportar dados) e importar no novo banco pelo Studio
   (`http://IP_DA_VPS:3100` → SQL editor) ou via `psql`.

3. **Recriar usuários de login** — a exportação não inclui as contas de auth:
   - No Studio self-hosted: **Authentication → Users → Add user** e crie o dono.
   - No SQL editor:
     ```sql
     insert into public.user_roles (user_id, role)
     values ('ID-DO-USUARIO-CRIADO', 'owner');
     ```
   - Os barbeiros podem ser recriados pelo painel do próprio app
     (menu **Barbeiros**), que já cria conta + senha.

## Etapa 4 — Build e deploy do app

```bash
# na VPS:
cd /opt
git clone https://github.com/hugorafaelbsmrb-cell/manoelves.git manoelves
cd manoelves

# cria o .env de produção (use deploy/app.env.production.example como base)
#   SUPABASE_URL / VITE_SUPABASE_URL      → http://IP_DA_VPS:8000
#   SUPABASE_PUBLISHABLE_KEY (VITE_)      → a ANON_KEY gerada
#   SUPABASE_SERVICE_ROLE_KEY             → a SERVICE_ROLE_KEY gerada
#   PORT                                  → 3001

npm ci
npm run build

pm2 start node --name manoelves -- .output/server/index.mjs
pm2 save
pm2 startup systemd -u root --hp /root   # inicia junto com o sistema
```

Configure o Caddy (conteúdo em `deploy/Caddyfile`):

```bash
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```

Valide em `http://IP_DA_VPS`: login, agendamento, upload de imagens (storage),
painel. Logs: `pm2 logs manoelves` e `journalctl -u caddy -f`.

### Como atualizar o app depois (novo código no GitHub)

```bash
cd /opt/manoelves
git pull
npm ci
npm run build
pm2 restart manoelves
```

## Etapa 5 — Tarefas agendadas e webhooks

1. **Cron de aniversário** — no SQL editor do Studio self-hosted, rode o
   conteúdo de `vps-migration/cron-jobs.sql` trocando a URL para
   `http://IP_DA_VPS/api/public/hooks/birthday-notify`.
2. **Mercado Pago** — atualize a URL do webhook para
   `http://IP_DA_VPS/api/public/mercadopago` (token e segredo já estão na
   tabela `integration_settings`, que migrou com os dados).
3. Confira no app as configurações de WhatsApp (uazapi) e signage (Sighor).

## Etapa 6 — Testes, backup e próximos passos

- Testar os fluxos: cadastro/login, agendamento com pagamento (PIX/cartão),
  comanda/PDV, signage TV, mensagens de WhatsApp (confirmação/lembrete).
- **Backup diário** (script `deploy/backup-db.sh`):
  ```bash
  cp deploy/backup-db.sh /opt/supabase/backup-db.sh
  chmod +x /opt/supabase/backup-db.sh
  echo '0 3 * * * root /opt/supabase/backup-db.sh >> /var/log/manoelves-backup.log 2>&1' > /etc/cron.d/manoelves-backup
  ```
- **Quando tiver domínio:** aponte `app.seudominio.com` e
  `supabase.seudominio.com` para o IP, substitua o bloco `:80` do Caddyfile
  pelos dois blocos comentados nele e atualize `API_EXTERNAL_URL`/`SITE_URL`
  (Supabase), `SUPABASE_URL` (app) e o webhook do Mercado Pago.

## Checklist final

- [ ] Studio acessível em `http://IP_DA_VPS:3100`
- [ ] App no ar em `http://IP_DA_VPS` com login funcionando
- [ ] Dados migrados (serviços, produtos, clientes, agendamentos)
- [ ] Dono com role `owner`; barbeiros recriados
- [ ] Upload de imagens funcionando (buckets de storage)
- [ ] Webhook do Mercado Pago apontando para a VPS
- [ ] `cron-jobs.sql` aplicado (aniversários)
- [ ] Backup diário agendado
- [ ] `pm2 startup` ativo (app volta sozinho após reboot)
