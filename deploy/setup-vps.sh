#!/usr/bin/env bash
# ============================================================
# Mano Elves — provisionamento da VPS (Ubuntu 22.04/24.04)
# Instala: Docker + Compose (Supabase), Node 20 LTS, PM2,
# Caddy, cliente psql e configura o firewall (UFW).
#
# Uso (na VPS, como root):
#   sudo bash setup-vps.sh
# ============================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Rode como root: sudo bash setup-vps.sh" >&2
  exit 1
fi

echo "==> Atualizando pacotes"
apt-get update -y
apt-get upgrade -y

echo "==> Instalando pacotes básicos"
apt-get install -y curl git ca-certificates gnupg lsb-release ufw postgresql-client

# --- Docker (instalador oficial) ---
if command -v docker >/dev/null 2>&1; then
  echo "==> Docker já instalado"
else
  echo "==> Instalando Docker + Compose"
  curl -fsSL https://get.docker.com | sh
fi

# --- Node.js 20 LTS (NodeSource) ---
if command -v node >/dev/null 2>&1 && [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -ge 20 ]]; then
  echo "==> Node.js $(node -v) já instalado"
else
  echo "==> Instalando Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# --- PM2 ---
if command -v pm2 >/dev/null 2>&1; then
  echo "==> PM2 já instalado"
else
  echo "==> Instalando PM2"
  npm install -g pm2
fi

# --- Caddy (repo oficial) ---
if command -v caddy >/dev/null 2>&1; then
  echo "==> Caddy já instalado"
else
  echo "==> Instalando Caddy"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

# --- Diretórios do projeto ---
mkdir -p /opt/manoelves /opt/supabase/backups
echo "==> Diretórios criados em /opt/manoelves e /opt/supabase"

# --- Firewall ---
echo "==> Configurando firewall (UFW)"
# 22  = SSH
# 80  = app (Caddy)
# 8000 = Supabase REST/Auth/Storage (Kong)
# 3100 = Supabase Studio (painel)
# 5432 = Postgres: NÃO liberar (fica só em localhost)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 8000/tcp
ufw allow 3100/tcp
ufw --force enable
ufw status

echo ""
echo "==> Provisionamento concluído."
echo "Reinicie a sessão SSH (ou rode 'newgrp docker') para usar Docker sem sudo."
