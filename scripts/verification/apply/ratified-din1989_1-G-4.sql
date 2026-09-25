BEGIN;
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_din1989_1 AS SELECT * FROM compliance_requirements WHERE false;
INSERT INTO compliance_requirements_archive_din1989_1
SELECT * FROM compliance_requirements
 WHERE id = '91691756-5397-438d-acd0-002b809f1e3c'
   AND md5(condition) = 'b0e62783483a98bb7e07d8f5052c519e';
UPDATE compliance_requirements
   SET condition = 'IF ueberlauf_versickerung == true THEN versickerung_bemessung_a138 == true'
 WHERE id = '91691756-5397-438d-acd0-002b809f1e3c'
   AND md5(condition) = 'b0e62783483a98bb7e07d8f5052c519e';
COMMIT;
