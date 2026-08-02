-- ROLLBACK for 20260801510000_corpus_isnotempty.sql — restore `!= ''` on the 24 touched gates only.
-- (These 24 gates had NO pre-existing IS NOT EMPTY, so reversing IS NOT EMPTY→!='' by id is exact.)
UPDATE compliance_requirements
   SET condition = regexp_replace(condition, $q$\s*IS NOT EMPTY$q$, $q$ != ''$q$, 'g')
 WHERE id IN (
   '8f8893de-c6b7-4a5f-8033-b2dba6cee91e','105f3f1e-0101-46f3-a247-22118b8dc009',
   '91815f81-4f3e-4367-9b10-45166ab4c349','01df7d7a-64e6-409f-a707-304a7ec92bb5',
   '6626d997-fdaa-44b7-8022-112f89c8d2cd','9816c304-7ee0-42f7-9ac4-1e4ba8db47e0',
   '65d76617-2e5b-4615-9fc7-83e0ab1d50a7','87a72dde-915d-489f-a3aa-cb6c2303f52b',
   '79a1beeb-8646-4916-ba94-c37f32563e13','0afdd28e-5ef0-4c27-8bfa-fc59f4e05a84',
   '8c15e0e6-9b2b-40bc-89c6-ba3c0c355317','c0476ace-1152-4015-9c71-3a52fbf6f392',
   'f8b8d02c-7e30-4784-8ea3-5e7852ec3f53','7a19cf97-81e3-4953-8907-ba2e94a85225',
   'b59d0328-cd8e-4eb1-b42b-af1717de6693','fb8b1395-2ab3-46be-84da-3690cd5b85e9',
   '84707557-9c67-4074-ab5d-851ff05c251d','a7d025a8-51ac-4f41-999d-29fe50196859',
   '2f6cad58-04cf-4ebf-b251-64418abc53df','94dccfd4-61de-4fe2-96f0-6fdfa9d13575',
   '3fa09344-f172-44b7-9831-2b323cc84af9','8b94e876-b9ff-4eab-afb1-8f3db67288ab',
   'ae60cca6-0d28-4508-b0ee-385274850860');
