#!/usr/bin/env bash
# Snapshot the current Supabase DB to a timestamped .sql file in /tmp.
# Reads DATABASE_URL from .env.local. Requires `pg_dump` in PATH.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL=$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set and not found in .env.local" >&2
  exit 1
fi

OUT="/tmp/ekowai-snapshot-$(date -u +%Y%m%dT%H%M%SZ).sql"
echo "Snapshotting to $OUT..."
pg_dump --no-owner --no-acl --clean --if-exists "$DATABASE_URL" > "$OUT"
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
ls -lh "$OUT"
