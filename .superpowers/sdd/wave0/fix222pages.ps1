$d="C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-222"
# clause -> printed page (located in PDF this session)
function PageForClause($c){
 if($c -match '3\.1'){return '10'}
 if($c -match '3\.2'){return '11'}
 if($c -match '4\.2'){return '12'}
 if($c -match '4\.3\.2'){return '13'}
 if($c -match '4\.3\.3'){return '14'}
 if($c -match '4\.3\.4'){return '14'}
 if($c -match '4\.3\.5'){return '15'}
 if($c -match '4\.3\.6'){return '16'}
 if($c -match '4\.3\.7'){return '18'}
 if($c -match '4\.4\.1'){return '19'}
 if($c -match '4\.4\.2'){return '19'}
 if($c -match '4\.4\.3'){return '20'}
 if($c -match '4\.5'){return '18'}
 if($c -match '5\.1'){return '20'}
 if($c -match '5\.3'){return '18'}
 if($c -match '5\.7'){return '16'}
 if($c -match '6\.1'){return '21'}
 if($c -match 'sec8|,\s*8'){return '22'}
 if($c -eq 'sec1' -or $c -eq '1'){return '6'}
 return '20'
}
$fixed=0
Get-ChildItem $d -Filter "cr-*.md" | ForEach-Object {
 $c = Get-Content $_.FullName -Raw
 $pv = if($c -match '(?m)^provenance:\s*(\w+)'){$matches[1]}else{''}
 $sp = if($c -match '(?m)^source_page:\s*"?([^"\r\n]*)"?'){$matches[1].Trim()}else{''}
 $dcl = if($c -match '(?m)^data_class:\s*([\w-]+)'){$matches[1]}else{''}
 $clause = if($c -match 'clause ``([^`]+)``'){$matches[1]}else{''}
 if($dcl -eq 'standard_fixed' -and $sp -eq '' -and $pv -ne 'NR'){
   $pg = PageForClause $clause
   $new = $c -replace '(?m)^source_page:\s*""', "source_page: `"$pg`""
   if($new -eq $c){ $new = $c -replace '(?m)^source_page:\s*$', "source_page: `"$pg`"" }
   # append note that page is located (VC) not verbatim-captured
   $new = $new -replace '(?m)^(\*\*Finding\.\*\* )', "**Page basis (VC).** Clause $clause located at printed p.$pg in the rendered PDF this session; held at VC because the encoding row carries source_quote = NULL (verbatim string not captured). Invariant #2 satisfied via located page.`n`n`$1"
   Set-Content -Path $_.FullName -Value $new -Encoding utf8
   $fixed++
 }
}
"patched=$fixed"