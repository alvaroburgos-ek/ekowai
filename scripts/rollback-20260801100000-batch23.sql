DO $$ BEGIN
  UPDATE equations SET formula='CRF = i * (1 + i)**n / ((1 + i)**n - 1)' WHERE id='befaedbd-00da-4876-a951-e84f2d8cf185';
  UPDATE equations SET output_unit=NULL WHERE id IN ('dec3bdb3-7578-45b5-86f6-7642c48790de','2389029e-58e8-4174-a79e-ab3fbab89e7a','a09b565f-bfc8-4518-aac8-32ff38b2ebd9','49fe794d-0b73-4cda-ad4b-02680057f34b','20079ef2-3e86-449f-9fe1-e5f0c602e729');
  UPDATE compliance_requirements SET description='Mechanical thickeners using natural gravity require an upstream flocculant mixing zone and flocculation unit.' WHERE id='ddc1f191-83e4-4e77-8c96-ffa7fcc91ca8';
END $$;
