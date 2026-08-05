-- APPLIED 2026-08-05 (owner batch auth; PDF-verified full 6.2.2 domain; behavior-preserving no-op; effect re-queried)
-- R-ENUM-FULLDOMAIN (risk med)
UPDATE compliance_requirements SET condition = 'assurance_conclusion IS NOT NULL' WHERE id = '13c1440c-36d3-44eb-a437-f647ffa21836';
