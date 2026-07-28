DO $$
BEGIN
  UPDATE equations SET formula = '%REUI(X) = (mREUI(X) / mTI(X)) * 100' WHERE id = '62e2cbfd-f530-4450-a9b7-1982fa1f955b';
  UPDATE equations SET formula = '%RECI(X) = (mRECI(X) / mTI(X)) * 100' WHERE id = '3d0e7b99-83ba-447d-9101-df3ab06c11c2';
  RAISE NOTICE 'ISO-59020 A.1/A.2 rolled back to % form';
END $$;
