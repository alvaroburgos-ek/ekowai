UPDATE compliance_requirements SET condition = 'IF n_a >= n_b THEN n_observation_period == n_a AND IF n_b >= n_a THEN n_observation_period == n_b' WHERE id = '8515755e-c02f-4a63-b89f-f06ae7b7d65f';
UPDATE compliance_requirements SET condition = 'IF n_a != n_b THEN partial_replication_flag == TRUE AND n_tr IS NOT NULL' WHERE id = '338d8e97-a22f-4e71-9018-a8d46d58d577';
