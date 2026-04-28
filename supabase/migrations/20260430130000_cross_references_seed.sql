INSERT INTO cross_references
  (source_regulation, source_version, source_section, trigger_condition,
   target_regulation, target_section, rationale, wizard_supported)
VALUES
  ('DWA-A-201', 'v3.2', '§A 6.5.4',
   '{"kind":"cmp","op":">","lhs":{"kind":"ref","id":"tank_volume_m3"},"rhs":{"kind":"lit","value":10000}}'::jsonb,
   'DWA-A-131', '§5.2',
   'Bei Beckenvolumen über 10 000 m³ Auslegung der Belüftungsanlage zusätzlich nach DWA-A-131 prüfen.',
   FALSE),
  ('DWA-A-201', 'v3.2', '§3.1',
   '{"kind":"cmp","op":"==","lhs":{"kind":"ref","id":"treatment_class"},"rhs":{"kind":"lit","value":1}}'::jsonb,
   'DWA-A-202', '§4',
   'Phosphorelimination wird durch DWA-A-202 mitabgedeckt — relevant bei Klasse N (Nitrifikation) für sensible Gewässer.',
   FALSE),
  ('DWA-A-201', 'v3.2', '§4.4',
   '{"kind":"cmp","op":"<","lhs":{"kind":"ref","id":"T_C"},"rhs":{"kind":"lit","value":8}}'::jsonb,
   'DWA-M-153', '§7.2',
   'Bei Bemessungstemperaturen unter 8 °C zusätzliche Hinweise zu Mindestschlammalter nach DWA-M-153 beachten.',
   FALSE)
ON CONFLICT (source_regulation, source_version, source_section, target_regulation, target_section)
  DO NOTHING;
