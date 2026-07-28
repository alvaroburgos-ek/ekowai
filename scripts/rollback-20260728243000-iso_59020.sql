-- ROLLBACK 20260728243000 ISO-59020
DO $$ BEGIN
  UPDATE compliance_requirements SET worksheet_template_id='6886d9d8-fa35-41a8-8a60-b0765615ab83' WHERE id IN ('e595d856-598c-4f8b-9baa-7d46f0965ec1','1e34ce41-b6de-4519-a77b-bc965b99c7ab','29e41319-c350-4cea-a2d7-db0149917d24');
  UPDATE compliance_requirements SET worksheet_template_id='5c2219d4-500d-4098-9d31-a2b54539e35d' WHERE id IN ('613d3729-2288-4208-a5d1-bea32015e69c','fa82fe4a-b392-4ca5-82e9-c6f224fb42dd','f7dc8e80-d22b-4180-93a1-56ec5fa3a223','6c26bf6e-446d-4d18-89e7-245673cc8258','43fdfba0-7551-4563-9b48-cd8d27098b4c');
END $$;
