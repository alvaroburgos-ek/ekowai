-- ROLLBACK for 20260728190000_iso14015_rehome_cr002_010.sql
-- Restores CR-002..CR-010 to their original home worksheet_template_id = ISO-14015-01.
DO $$
DECLARE v_n int := 0;
  ws01 uuid := '758d1271-96bf-4561-9427-6e97f8215f08';
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id = ws01
   WHERE id IN ('79f21f31-e2ae-48e2-a855-41fce38ea38a','15e4cb86-22c6-4afa-8237-000b4ce69371',
                'd19e0f24-02d9-47e3-aee2-e4ed5d31fed3','2e0190dd-4293-48ac-9a8b-0ace7aef3c07',
                '4da8f445-2029-4e8b-8f5e-1fbe1f9dfc05','7c53a380-000d-4933-953e-c0713cadd516',
                '9d102dc9-54a2-4836-8eb3-156ec4b56f01','bb485c16-a2ea-4249-9a08-352b391586b3',
                '8f661a8e-7146-466f-ae27-266e1a143560');
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'rolled back % rows to ws01', v_n;
END $$;
