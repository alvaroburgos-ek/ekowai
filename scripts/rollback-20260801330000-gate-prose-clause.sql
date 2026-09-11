-- Rollback: restore the original prose clause_references by id.
DO $$
BEGIN
  UPDATE compliance_requirements SET clause_reference='6.3.4 Bestehende Ansätze zur Risikocharakterisierung und -bewertung' WHERE id='3782e6ef-6aa1-446c-a1a2-0572f67d9ad8';
  UPDATE compliance_requirements SET clause_reference='5.4.3 Verlaengerung einer Einleitungserlaubnis nicht beantragt' WHERE id='4b609e49-c54e-4e88-b5c5-00849c0a958b';
  UPDATE compliance_requirements SET clause_reference='4.3.1 Vertical Filters as the Main Biological Treatment Step for Small Wastewater Treatment Systems' WHERE id='5ca3b36a-7710-4707-95ab-6463990a278e';
  UPDATE compliance_requirements SET clause_reference='5.1 Documentation of the Measuring Results' WHERE id='65b335ec-5f70-4b36-8b8a-cb3cd220a4bf';
  UPDATE compliance_requirements SET clause_reference='4.3.6 Statusberichte werden nicht als wichtiges Instrument erkannt' WHERE id='75b3dd34-1dc9-4a05-8e14-c37032d49f0f';
  UPDATE compliance_requirements SET clause_reference='3.2 Requirements on the Manufacturers of Analytical Devices and Reagents' WHERE id='87f8bd72-c9f5-4aa2-92ef-fa3b141d399f';
  UPDATE compliance_requirements SET clause_reference='4.3.7 Aenderungsmanagement wird fuer ueberfluessig gehalten' WHERE id='8b691c7e-2dd1-4a9f-ad76-f69c81e5567a';
  UPDATE compliance_requirements SET clause_reference='4.3.4 Zielkonflikt zwischen betrieblichen Anforderungen und Budget' WHERE id='a566bd2d-fece-4f06-9f78-85181d3aae2e';
  UPDATE compliance_requirements SET clause_reference='4.4 Quality Controls, Plausibility of the Measuring Results' WHERE id='a72564cd-2ffd-442e-954e-d22ee9574098';
  UPDATE compliance_requirements SET clause_reference='4.3.3 Vertical Flow Filters as the Main Biological Treatment Step in Municipal Wastewater Treatment Plants' WHERE id='a90e802c-4e6d-4194-82b2-06d83b26f335';
  UPDATE compliance_requirements SET clause_reference='6.1 Allgemeine Grundsätze und Rolle des Risikomanagementplans' WHERE id='ad843ef1-8998-478c-acd7-459861a8a960';
  UPDATE compliance_requirements SET clause_reference='3.2 Requirements on the Manufacturers of Analytical Devices and Reagents' WHERE id='ae6e92a6-f766-45d5-8444-6e43ffb7dc06';
  UPDATE compliance_requirements SET clause_reference='4.3.4 / 4.5 Treatment Systems with Additional Requirements on the Effluent Quality (TKN dimensioning, Eq. 14)' WHERE id='cd8e9cb7-2f0a-4353-be40-77d5bc8b321d';
  UPDATE compliance_requirements SET clause_reference='7.2.3 Digital in Planung und Ausführung / Ziele' WHERE id='d51be29e-f075-4703-95f8-2c599825023f';
  UPDATE compliance_requirements SET clause_reference='8.3.2 Grundlagen fuer Building Information Modeling (BIM) fehlen' WHERE id='efc3b96a-b83a-4034-af94-e77195f3b29c';
  UPDATE compliance_requirements SET clause_reference='3.2 Requirements on the Manufacturers of Analytical Devices and Reagents' WHERE id='f8ecc7f9-4b7f-4985-82b1-367e9408e95d';
  RAISE NOTICE 'gate prose clause_references restored';
END $$;
