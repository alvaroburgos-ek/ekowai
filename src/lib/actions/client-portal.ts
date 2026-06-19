'use server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMembership } from '@/lib/auth/membership';
import {
  buildClientProjectView,
  type ClientProjectView,
  type CurationField,
} from './client-view';

/** The ONLY client data path. Runs as service role (bypasses RLS) but
 * self-checks that the caller is the client of exactly this project, so it can
 * never be used to read a foreign project. Returns null on any failure. */
export async function getClientProjectView(
  projectId: string,
): Promise<ClientProjectView | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await getMembership(user.id);
  if (
    !membership ||
    membership.kind !== 'external' ||
    membership.role !== 'client' ||
    membership.projectId !== projectId
  ) {
    return null;
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('name, project_code, location')
    .eq('id', projectId)
    .single();
  if (!project) return null;

  const { data: params } = await admin
    .from('project_parameters')
    .select('field_id, source_type, value_number, value_text, value_enum')
    .eq('project_id', projectId)
    .in('source_type', ['computed', 'derived']);

  const fieldIds = [...new Set((params ?? []).map((p) => p.field_id))];
  const fieldsById: Record<string, CurationField> = {};
  if (fieldIds.length > 0) {
    const { data: fields } = await admin
      .from('fields')
      .select('id, symbol, unit, label_de')
      .in('id', fieldIds);
    for (const f of fields ?? []) {
      fieldsById[f.id] = { symbol: f.symbol, unit: f.unit, label_de: f.label_de };
    }
  }

  const { data: instances } = await admin
    .from('worksheet_instances')
    .select('status')
    .eq('project_id', projectId);

  return buildClientProjectView({
    project,
    params: params ?? [],
    fieldsById,
    instances: instances ?? [],
  });
}

/** Designer hand-off is delivered via the Task Brief (SP-4). In SP-1 there is
 * no designer data path yet — return an empty list. */
export async function getDesignerTasks(_projectId: string): Promise<never[]> {
  return [];
}
