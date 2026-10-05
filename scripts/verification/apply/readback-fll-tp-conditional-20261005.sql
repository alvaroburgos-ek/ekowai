-- Read-back after 20261005120000_fll_tp_rhizom_conditional_fields.sql (prod-query.mjs, read-only).
-- Expected: arbeitsfuge_zeitabstand_h visible_when 'ist_bahnenartig == false'; the five seam fields 'ist_bahnenartig == true';
-- schutzschicht_definition required + 'mehrschichtprodukt == true'; the two VTS thickness fields list FLLTP-RHZ-06 as consumer.
select w.code as ws, f.symbol, f.is_required, f.visible_when, array_to_string(f.consumer_worksheets, ',') as consumers
from fields f join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
where s.code = 'FLL-TP-RHIZOM-2023' and f.symbol in ('arbeitsfuge_zeitabstand_h','naht_anzahl_wand_eck','naht_anzahl_boden_eck','naht_anzahl_t_naht','naht_anzahl_laengs_2_pruefmuster','pruefmuster_2_versatz_grad','schutzschicht_definition','vts_untere_schicht_dicke_mm','vts_obere_schicht_dicke_mm')
order by 1, 2;
