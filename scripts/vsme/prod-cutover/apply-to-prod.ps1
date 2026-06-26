<#
  VSME prod cutover — applies the staged SQL to Supabase prod via the
  Management API (same mechanism as the Pass3c MCP push). RUN ONLY ON GO.

  Auth: set the PAT in the environment first (never hard-code / never echo):
      $env:SUPABASE_PAT = '<personal-access-token>'
  Then:
      ./apply-to-prod.ps1            # applies 01 -> 02 -> 03 in order, then verifies
      ./apply-to-prod.ps1 -Rollback  # applies 99-rollback.sql instead

  Holds nothing back once invoked — this writes to PROD. Do not run without
  an explicit go. Schema + seed are additive/idempotent; safe to re-run.
#>
param([switch]$Rollback)

$ErrorActionPreference = 'Stop'
$ref = 'vadsmshzebefjreqcicl'
$endpoint = "https://api.supabase.com/v1/projects/$ref/database/query"
$pat = $env:SUPABASE_PAT
if (-not $pat) { throw 'Set $env:SUPABASE_PAT first (the Supabase personal access token).' }
$headers = @{ Authorization = "Bearer $pat"; 'Content-Type' = 'application/json' }
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-SqlFile($file) {
  $path = Join-Path $here $file
  $sql = Get-Content -Raw -Encoding UTF8 $path
  $body = @{ query = $sql } | ConvertTo-Json -Depth 3 -Compress
  Write-Host "→ POST $file ($([math]::Round((Get-Item $path).Length/1kb,1)) KB)..." -NoNewline
  $r = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body
  Write-Host ' OK'
  return $r
}

if ($Rollback) {
  Write-Host 'ROLLBACK — reversing VSME cutover on PROD.' -ForegroundColor Yellow
  Invoke-SqlFile '99-rollback.sql' | Out-Null
  Write-Host 'Rollback applied.' -ForegroundColor Green
  return
}

Write-Host "VSME cutover → PROD ($ref)" -ForegroundColor Cyan
Invoke-SqlFile '01-schema.sql'              | Out-Null
Invoke-SqlFile '02-seed-vsme.sql'           | Out-Null
Invoke-SqlFile '03-seed-emission-factors.sql' | Out-Null

Write-Host '--- verify (expect VSME=true, templates=41, fields=143, factors=281, co2 table=true) ---' -ForegroundColor Cyan
$verify = @{ query = @"
SELECT json_build_object(
  'vsme_present', EXISTS(SELECT 1 FROM standards WHERE code='VSME'),
  'templates', (SELECT count(*) FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='VSME'),
  'fields', (SELECT count(*) FROM fields f JOIN worksheet_templates wt ON wt.id=f.worksheet_template_id JOIN standards s ON s.id=wt.standard_id WHERE s.code='VSME'),
  'emission_factors', (SELECT count(*) FROM emission_factors),
  'co2_table', (to_regclass('public.co2_activity_lines') IS NOT NULL),
  'ef_policies', (SELECT count(*) FROM pg_policies WHERE tablename='emission_factors')
) AS r;
"@ } | ConvertTo-Json -Depth 3 -Compress
$res = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $verify
($res | ConvertTo-Json -Depth 6)
Write-Host 'Schema + data on prod. Next: merge code to main, then vercel --prod + re-point alias.' -ForegroundColor Green
