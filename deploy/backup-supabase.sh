#!/usr/bin/env bash
# Nightly backup of the Supabase database to the VPS.
#
# The Supabase free plan keeps no backups the house can download, so this
# dumps the database every night and keeps the last 14 dumps.
#
# Install on the VPS (once):
#   apt-get install -y postgresql-client-16      # pg_dump must be >= the server's major version
#   install -m 700 deploy/backup-supabase.sh /usr/local/bin/gem-db-backup
#   echo 'SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' > /etc/gem-db-backup.env
#   chmod 600 /etc/gem-db-backup.env
#   echo '30 2 * * * root /usr/local/bin/gem-db-backup' > /etc/cron.d/gem-db-backup
#
# The connection string is in Supabase → Project Settings → Database →
# Connection string (Session pooler). Restore with:
#   gunzip -c <file>.sql.gz | psql "$SUPABASE_DB_URL"
set -euo pipefail

# shellcheck disable=SC1091
source /etc/gem-db-backup.env
DIR=/var/backups/gem-db
KEEP=14
mkdir -p "$DIR"

stamp=$(date -u +%Y-%m-%dT%H%MZ)
out="$DIR/gem-$stamp.sql.gz"

pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage | gzip -9 > "$out.part"
mv "$out.part" "$out"

ls -1t "$DIR"/gem-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "backup written: $out ($(du -h "$out" | cut -f1))"
