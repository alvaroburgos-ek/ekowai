-- Verify 20260723_fll_gar27_c_dedupe_retag.
-- Expect: consumed C active=true, source_file=PDF, source_quote LIKE 'Abflussbeiwert C = 1%';
--         twin C_abflusswert active=false.
SELECT id, symbol, active, clause_reference, source_file,
       left(source_quote, 40) AS source_quote_head
FROM fields
WHERE id IN ('d6f02425-71c9-4a85-bfd2-35069a118771',
             '34d5b6f0-faf8-4f4c-b308-b330b36f6d94')
ORDER BY symbol;
