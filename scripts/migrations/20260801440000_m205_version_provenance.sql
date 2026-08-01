-- DWA-M-205 · provenance correction (pre-authorized): DB version "April 2013" ≠ printed cover.
-- SOURCE (verbatim, cover p.1 / DWA-M_205.md L5,L11): "März 2013".
UPDATE standards SET version = 'März 2013'
 WHERE code = 'DWA-M-205' AND version = 'April 2013';
