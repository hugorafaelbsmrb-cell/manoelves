#!/usr/bin/env bash
# ============================================================
# Mano Elves — backup diário do Postgres do Supabase
# Lê a senha do .env do compose, gera pg_dump (formato custom)
# e mantém os últimos 7 backups em /opt/supabase/backups.
#
# Instalação (na VPS, como root):
#   cp backup-db.sh /opt/supabase/backup-db.sh
#   chmod +x /opt/supabase/backup-db.sh
#   echo '0 3 * * * root /opt/supabase/backup-db.sh >> /var/log/manoelves-backup.log 2>&1' > /etc/cron.d/manoelves-backup
#
# Restaurar um backup:
#   docker exec -i -e PGPASSWORD=SUA_SENHA supabase-db \
#     pg_restore -U postgres -h localhost -d postgres --clean --if-exists < backup_AAAA-MM-DD_HHMMSS.dump
# ============================================================
set -euo pipefail

ENV_FILE="/opt/supabase/supabase/docker/.env"
BACKUP_DIR="/opt/supabase/backups"
RETENTION_DAYS=7

# Pega a senha do .env do compose (linha POSTGRES_PASSWORD=...)
PGPASS="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
if [[ -z "$PGPASS" ]]; then
  echo "POSTGRES_PASSWORD não encontrado em $ENV_FILE" >&2
  exit 1
fi

STAMP="$(date +%F_%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker exec -e PGPASSWORD="$PGPASS" supabase-db \
  pg_dump -U postgres -h localhost -d postgres --format=custom \
  > "$BACKUP_DIR/backup_$STAMP.dump"

echo "Backup salvo em $BACKUP_DIR/backup_$STAMP.dump"

# Remove backups com mais de N dias
find "$BACKUP_DIR" -name 'backup_*.dump' -mtime +"$RETENTION_DAYS" -delete
echo "Retenção de $RETENTION_DAYS dias aplicada."
