// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { projectScenarios, projectScenarioOverrides, projectScenarioSettings } from '../schema';

const MIG = resolve(__dirname, '../../../../supabase/migrations/_STAGED_20261014120000_project_scenarios.sql');
const RB = resolve(__dirname, '../../../../supabase/migrations/_STAGED_rollback-20261014120000_project_scenarios.sql');

describe('what-if case tables', () => {
  it('project_scenarios carries the spec columns, a slot check and an active-slot unique index', () => {
    const c = getTableConfig(projectScenarios);
    expect(c.name).toBe('project_scenarios');
    expect(c.columns.map((x) => x.name).sort()).toEqual(
      ['archived_at', 'created_at', 'created_by', 'id', 'include_in_report', 'name', 'project_id', 'reason', 'sort_order', 'updated_at'],
    );
    expect(c.checks.map((x) => x.name)).toContain('project_scenarios_slot_range');
    expect(c.indexes.map((x) => x.config.name)).toContain('project_scenarios_active_slot_unique');
  });
  it('project_scenario_overrides is unique per (scenario, field) and stores FieldValue json', () => {
    const c = getTableConfig(projectScenarioOverrides);
    expect(c.columns.map((x) => x.name).sort()).toEqual(
      ['base_value_at_creation', 'created_at', 'field_id', 'id', 'note', 'scenario_id', 'updated_at', 'value'],
    );
    expect(c.uniqueConstraints.map((u) => u.columns.map((x) => x.name))).toContainEqual(['scenario_id', 'field_id']);
  });
  it('project_scenario_settings is one row per project', () => {
    const c = getTableConfig(projectScenarioSettings);
    expect(c.columns.map((x) => x.name).sort()).toEqual(['enabled', 'project_id', 'updated_at', 'updated_by']);
  });
  it('the staged migration creates the three tables, enables RLS and never alters an existing table', () => {
    const sql = readFileSync(MIG, 'utf-8');
    for (const t of ['project_scenarios', 'project_scenario_overrides', 'project_scenario_settings']) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${t}`);
      expect(sql).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).not.toMatch(/ALTER TABLE public\.(projects|project_parameters|fields|worksheet_instances)\b/);
    expect(sql).toContain('sort_order BETWEEN 1 AND 6');
    expect(sql).toContain("om.role IN ('owner','admin','engineer')");
    const rb = readFileSync(RB, 'utf-8');
    expect(rb).toContain('DROP TABLE IF EXISTS public.project_scenario_overrides');
    expect(rb).toContain('DROP TABLE IF EXISTS public.project_scenarios');
    expect(rb).toContain('DROP TABLE IF EXISTS public.project_scenario_settings');
  });
});
