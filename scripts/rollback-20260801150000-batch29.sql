-- Reverses batch29 **->^ for exactly these 10 ids (each had a single power '**' and 0 pre-existing '^').
DO $$ BEGIN
  UPDATE equations SET formula = replace(formula,'^','**')
   WHERE id IN ('622e9035-4e55-475d-afb0-ef6a8561400b','417681bd-808e-4277-9241-8786d8a95c93',
     '2b23b131-69e2-4d80-ad74-12e62b7632f4','8bb44beb-bb59-4351-8c98-b3d49b5905a6',
     '16c436d2-c736-4529-a90b-601b61786e0d','3d9d0643-e2c8-407d-9548-dbd0435c7358',
     'f230d2c6-c75f-4d8d-a1db-d03fdddcbd6c','80467129-1929-4bdf-9227-0f8798bc978e',
     '1aaff78a-86d1-4249-8586-fb208114954e','4b385bc0-3870-4916-a5c1-25d6faca11d9');
END $$;
