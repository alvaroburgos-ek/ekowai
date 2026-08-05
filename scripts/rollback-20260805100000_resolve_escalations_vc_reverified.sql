-- ROLLBACK for 20260805100000_resolve_escalations_vc_reverified.sql — restores severity='block' on the 10 flipped gates
UPDATE compliance_requirements SET severity = 'block' WHERE id = '380523c0-a93e-4cc2-9bd8-b0fb68995582';
UPDATE compliance_requirements SET severity = 'block' WHERE id = '22f9df00-7368-4855-94a1-e68dff901654';
UPDATE compliance_requirements SET severity = 'block' WHERE id = '49b280e6-801c-4a93-98df-02e2d6c0e6cc';
UPDATE compliance_requirements SET severity = 'block' WHERE id = 'beabf464-e506-4e73-8176-8f29164136e4';
UPDATE compliance_requirements SET severity = 'block' WHERE id = 'ee4b65df-0721-451a-814e-5abbf4bc43c0';
UPDATE compliance_requirements SET severity = 'block' WHERE id = 'db1ee211-443c-4ece-825e-85e8f0156f34';
UPDATE compliance_requirements SET severity = 'block' WHERE id = 'b7b22fc4-251f-4862-8b91-28e308a35de0';
UPDATE compliance_requirements SET severity = 'block' WHERE id = '19f7c726-5182-45b6-9a5b-2e494f9505d0';
UPDATE compliance_requirements SET severity = 'block' WHERE id = 'c6a10549-55ab-480d-852c-03324920d86d';
UPDATE compliance_requirements SET severity = 'block' WHERE id = 'ee3adf6a-7618-470f-9dcd-1c4381e58975';
