-- Enable RLS on all business tables
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_references    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_metrics ENABLE ROW LEVEL SECURITY;

-- profiles: user can read+update their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- profiles: members of same org can read each other (for member lists)
CREATE POLICY profiles_select_orgmates ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM org_members
      WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    )
  );

-- orgs: members can read; only owners can update/delete
CREATE POLICY orgs_select ON orgs
  FOR SELECT USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY orgs_update ON orgs
  FOR UPDATE USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner')
  );
-- INSERT happens via Server Action with service role key (org creation)

-- org_members: members can read other members in their orgs
CREATE POLICY members_select ON org_members
  FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
-- INSERT/DELETE happen via Server Action with service role key

-- projects: members can SELECT; engineer-and-above can INSERT/UPDATE/DELETE
CREATE POLICY projects_select ON projects
  FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','engineer')
    )
  );
CREATE POLICY projects_update ON projects
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','engineer')
    )
  );

-- calculations: same role pattern
CREATE POLICY calcs_select ON calculations
  FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY calcs_insert ON calculations
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','engineer')
    )
  );
CREATE POLICY calcs_update ON calculations
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','engineer')
    )
  );

-- calculation_history: read-only for org members
CREATE POLICY history_select ON calculation_history
  FOR SELECT USING (
    calculation_id IN (
      SELECT id FROM calculations
      WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    )
  );
-- INSERT happens via Server Action

-- decisions + approvals: org-scoped (Plan 3 uses these)
CREATE POLICY decisions_select ON decisions
  FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY approvals_select ON approvals
  FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- cross_references: public read, no writes from clients
CREATE POLICY xref_public_read ON cross_references
  FOR SELECT USING (true);

-- calculation_metrics: org-scoped read (MVP-2 will write via service role)
CREATE POLICY metrics_select ON calculation_metrics
  FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
