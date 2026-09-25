BEGIN;
UPDATE compliance_requirements c
   SET worksheet_template_id = a.worksheet_template_id, code = a.code, title_de = a.title_de, title_en = a.title_en,
       condition = a.condition, clause_reference = a.clause_reference, severity = a.severity,
       description = a.description, suggestion = a.suggestion, audit_status = a.audit_status,
       source_file = a.source_file, source_anchor = a.source_anchor, source_quote = a.source_quote,
       audit_notes = a.audit_notes, audited_at = a.audited_at, audited_by = a.audited_by,
       requires_attestation = a.requires_attestation
  FROM compliance_requirements_archive_a262e a
 WHERE c.id = a.id;
DROP TABLE compliance_requirements_archive_a262e;
COMMIT;
