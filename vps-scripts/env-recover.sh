#!/usr/bin/env bash
# Recuperacao de envs perdidas do app Mano Elves (VPS)
echo '=== pm2 dump envs (antigas) ==='
grep -oE '"(SUPABASE_URL|VITE_SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY|APP_URL|PORT|NITRO_PORT|INTERNAL_HOOKS_SECRET)"[^,]*' /root/.pm2/dump.pm2 2>/dev/null | head -15

echo '=== pm2 env 0 (processo atual) ==='
pm2 env 0 2>/dev/null | grep -iE 'SUPABASE|APP_URL|PORT' | head -15

echo '=== supabase.vhex.app (https) ==='
curl -s -m 8 -o /dev/null -w 'https://supabase.vhex.app/auth/v1/health -> HTTP %{http_code}\n' https://supabase.vhex.app/auth/v1/health 2>&1 | head -1

echo '=== kong local 8000 ==='
curl -s -m 8 -o /dev/null -w 'http://127.0.0.1:8000/auth/v1/health -> HTTP %{http_code}\n' http://127.0.0.1:8000/auth/v1/health 2>&1 | head -1

echo '=== kong publico 8000 ==='
curl -s -m 8 -o /dev/null -w 'http://209.50.229.117:8000/auth/v1/health -> HTTP %{http_code}\n' http://209.50.229.117:8000/auth/v1/health 2>&1 | head -1

echo '=== compose working dir ==='
docker inspect supabase-db --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>&1 | head -1
docker inspect supabase-db --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' 2>&1 | head -1
echo 'FIM'
