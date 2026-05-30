#!/usr/bin/env bash
# THROWAWAY: post the Wizard standards-import progress to Slack #wizard (C0B63P4K49F)
# via the ekowaiclaudetoslack bot. The token is resolved at runtime from your env /
# ~/ekowai-linear-sync/.env, or the remote host as a fallback — nothing is hard-coded.
#
# Run it yourself:  ! bash /mnt/c/ekowai-wizard/scripts/_slack-post-tmp.sh
#
set -uo pipefail
CH=C0B63P4K49F
ENVF="$HOME/ekowai-linear-sync/.env"

# resolve token: explicit env var → local .env → (caller may fall back to remote)
T="${SLACK_BOT_TOKEN:-}"
if [ -z "$T" ] && [ -f "$ENVF" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENVF" 2>/dev/null || true; set +a
  T="${SLACK_BOT_TOKEN:-${SLACK_TOKEN:-${SLACK_API_TOKEN:-}}}"
  [ -z "$T" ] && T=$(grep -oE 'xoxb-[A-Za-z0-9-]+' "$ENVF" 2>/dev/null | head -1 || true)
fi

MSG=$(CH="$CH" python3 - <<'PY'
import json, os
text = (
":white_check_mark: *Wizard — Standards-Library Import (Prod)*\n\n"
"9 neue Normen in die DB-getriebene Standards-Library importiert (Prod) — atomar + idempotent, alle per COUNT verifiziert. `standards`: 114 → 123.\n\n"
"• DIN-276 · DWA-A-102-2 · DWA-A-178 · *DWA-A-262E* (Nachos Fix) · DWA-M-102-4 · DWA-M-179-1 · FLL-GAR-2023 · FLL-Naturteich · *FLL-TP-RHIZOM-2023* (Rev1)\n\n"
"Die zwei zuvor fehlerhaften Dateien validieren nach Nachos Fix jetzt sauber. Alle Felder `imported_unverified`; Pilot-Standards unberührt.\n\n"
"*Nächste Schritte:* Standards in der App den Projekten zuordnen → Ingenieur-Verifizierung. Workflow dokumentiert in CLAUDE.md + Vault."
)
print(json.dumps({"channel": os.environ["CH"], "text": text, "unfurl_links": False}))
PY
)

echo "=== posting to Slack #wizard ($CH) ==="
if [ -n "${T:-}" ]; then
  resp=$(printf '%s' "$MSG" | curl -s -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $T" -H "Content-type: application/json; charset=utf-8" --data @-)
else
  echo "(no local token found — trying remote host 100.101.245.87 over your SSH)"
  resp=$(printf '%s' "$MSG" | ssh ekowai@100.101.245.87 \
    'source ~/ekowai-linear-sync/.env 2>/dev/null; T="${SLACK_BOT_TOKEN:-${SLACK_TOKEN:-${SLACK_API_TOKEN:-$(grep -oE "xoxb-[A-Za-z0-9-]+" ~/ekowai-linear-sync/.env 2>/dev/null | head -1)}}}"; curl -s -X POST https://slack.com/api/chat.postMessage -H "Authorization: Bearer $T" -H "Content-type: application/json; charset=utf-8" --data @-')
fi

printf '%s' "$resp" | python3 -c 'import sys,json
raw=sys.stdin.read()
try:
    d=json.loads(raw); print("posted ok:", d.get("ok"), "| ts:", d.get("ts"), "| error:", d.get("error"))
except Exception:
    print("unexpected response:", raw[:300] or "(empty)")'
