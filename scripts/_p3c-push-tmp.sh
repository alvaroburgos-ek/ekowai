#!/usr/bin/env bash
# THROWAWAY helper (NOT committed). Pushes the 9 generated Pass3c standards to the prod
# Supabase DB via the Management API — the SAME endpoint the Supabase MCP uses internally
# for execute_sql. Each <code>.sql is one atomic, idempotent DO block. Uses python3 (no jq).
#
# Run it yourself (the leading "!" runs it in this session as your action):
#     ! bash /mnt/c/ekowai-wizard/scripts/_p3c-push-tmp.sh
# or with an explicit token:
#     ! SUPABASE_ACCESS_TOKEN=sbp_xxx bash /mnt/c/ekowai-wizard/scripts/_p3c-push-tmp.sh
#
set -uo pipefail
REF=vadsmshzebefjreqcicl
DIR=/mnt/c/ekowai-wizard/.tmp-p3c-sql
API="https://api.supabase.com/v1/projects/${REF}/database/query"

TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  for cfg in "$HOME/.claude.json" "/mnt/c/ekowai-wizard/.mcp.json" "$HOME/.claude/.mcp.json" "$HOME/.config/claude/.claude.json"; do
    [ -f "$cfg" ] || continue
    TOKEN=$(grep -oE 'sbp_[A-Za-z0-9_]+' "$cfg" 2>/dev/null | head -1 || true)
    [ -n "$TOKEN" ] && { echo "(token found in $cfg)"; break; }
  done
fi
if [ -z "$TOKEN" ]; then
  echo "ERROR: could not find a Supabase access token (sbp_...)."
  echo "Re-run: SUPABASE_ACCESS_TOKEN=sbp_xxxxx bash /mnt/c/ekowai-wizard/scripts/_p3c-push-tmp.sh"
  exit 1
fi

PYJSON_FILE='import json,sys; sys.stdout.write(json.dumps({"query": open(sys.argv[1], encoding="utf-8").read()}))'
PYJSON_STDIN='import json,sys; sys.stdout.write(json.dumps({"query": sys.stdin.read()}))'

post_file() {  # $1 = path to a .sql file → echoes API response
  python3 -c "$PYJSON_FILE" "$1" \
    | curl -s -X POST "$API" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" --data @-
}
post_sql() {   # $1 = literal SQL → echoes API response
  printf '%s' "$1" | python3 -c "$PYJSON_STDIN" \
    | curl -s -X POST "$API" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" --data @-
}

CODES=(DIN-276 DWA-A-102-2 DWA-A-178 DWA-A-262E DWA-M-102-4 DWA-M-179-1 FLL-GAR-2023 FLL-Naturteich FLL-TP-RHIZOM-2023)

echo "=== pushing ${#CODES[@]} standards to prod (${REF}) ==="
for code in "${CODES[@]}"; do
  f="${DIR}/${code}.sql"
  if [ ! -f "$f" ]; then echo "SKIP $code  (missing $f)"; continue; fi
  resp=$(post_file "$f")
  if echo "$resp" | grep -qiE '"(error|message)"'; then
    echo "FAIL $code : $(echo "$resp" | head -c 400)"
  else
    echo "OK   $code"
  fi
done

echo
echo "=== verification (standards now in DB with counts) ==="
post_sql "select s.code,
  (select count(*) from worksheet_templates wt where wt.standard_id=s.id) as worksheets,
  (select count(*) from fields f join worksheet_templates wt on wt.id=f.worksheet_template_id where wt.standard_id=s.id) as fields,
  (select count(*) from equations e join worksheet_templates wt on wt.id=e.worksheet_template_id where wt.standard_id=s.id) as equations,
  (select count(*) from compliance_requirements c join worksheet_templates wt on wt.id=c.worksheet_template_id where wt.standard_id=s.id) as compliance
from standards s
where s.code in ('DIN-276','DWA-A-102-2','DWA-A-178','DWA-A-262E','DWA-M-102-4','DWA-M-179-1','FLL-GAR-2023','FLL-Naturteich','FLL-TP-RHIZOM-2023')
order by s.code;"
echo
