#!/usr/bin/env bash
# ============================================================
# Deploy do Mano Elves na VPS — SEM SEGREDOS neste arquivo.
# Uso (de dentro da VPS, como root):
#   bash /opt/manoelves/deploy/deploy.sh
# Requisitos: git remote apontando para o repo, bun instalado
# (/root/.bun/bin) e app já registrado no pm2 como "manoelves".
# ============================================================
set -e
export PATH="/root/.bun/bin:$PATH"
cd /opt/manoelves

echo "===== 1) PRESERVA .env LOCAL ====="
cp .env /tmp/manoelves.env.bak
git checkout -- .env

echo "===== 2) GIT PULL ====="
git pull origin main

echo "===== 3) RESTAURA .env LOCAL ====="
cp /tmp/manoelves.env.bak .env

echo "===== 4) BUN INSTALL ====="
bun install --no-progress

echo "===== 5) BUILD ====="
NITRO_PRESET=node_server bun run build

echo "===== 6) PM2 RESTART ====="
pm2 restart manoelves --update-env
sleep 6

echo "===== 7) VERIFICACAO ====="
curl -s -o /dev/null -w "app -> HTTP %{http_code}\n" http://127.0.0.1:3001/
echo "DEPLOY OK"
