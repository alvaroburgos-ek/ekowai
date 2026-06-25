-- VSME: RLS for emission_factors — mirrors the standards/fields/equations
-- reference-table pattern (read-only reference data). Authenticated users may
-- SELECT; writes are service-role only (the seeder in Plan 2). No
-- INSERT/UPDATE/DELETE policy is created, so client writes are denied.
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emission_factors_read_authenticated" ON emission_factors;
CREATE POLICY "emission_factors_read_authenticated"
  ON emission_factors FOR SELECT TO authenticated USING (true);
