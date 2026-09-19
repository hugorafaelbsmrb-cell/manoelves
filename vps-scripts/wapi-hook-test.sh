#!/bin/bash
echo "=== HOOK TEST (secret correto) ==="
SECRET=$(docker exec -i supabase-db psql -U postgres -d postgres -t -A -c "select internal_hooks_secret from integration_settings limit 1;")
echo "secret length: ${#SECRET}"
curl -s -X POST "http://127.0.0.1:3001/api/public/hooks/marketing-send-scheduled?secret=${SECRET}" -H "Content-Type: application/json"
echo ""
echo "=== BIRTHDAY HOOK TEST (W-API ainda sem token? espera wapi-not-configured) ==="
curl -s -X POST "http://127.0.0.1:3001/api/public/hooks/birthday-notify?secret=${SECRET}" -H "Content-Type: application/json" | head -c 300
echo ""
echo "=== ULTIMAS MENSAGENS LOG ==="
docker exec -i supabase-db psql -U postgres -d postgres -t -c "select kind, to_phone, created_at from messages_log order by created_at desc limit 5;"
echo ""
echo "=== CAMPANHAS (deve estar vazio) ==="
docker exec -i supabase-db psql -U postgres -d postgres -t -c "select id, title, status from marketing_campaigns order by created_at desc limit 5;"
echo ""
echo "DONE"
