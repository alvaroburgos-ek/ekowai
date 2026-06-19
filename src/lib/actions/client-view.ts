const CLIENT_VISIBLE_SOURCE_TYPES = new Set(['computed', 'derived']);
const APPROVED_STATUSES = new Set(['engineer_approved', 'final']);

export type CurationParam = {
  field_id: string;
  source_type: string;
  value_number: number | null;
  value_text: string | null;
  value_enum: string | null;
};
export type CurationField = { symbol: string; unit: string | null; label_de: string };
export type CurationInstance = { status: string };

export type ClientProjectView = {
  project: { name: string; code: string | null; location: string | null };
  outcomes: Array<{ label: string; value: string; unit: string | null }>;
  progress: { worksheetsTotal: number; worksheetsApproved: number; percent: number };
};

function paramValue(p: CurationParam): string | null {
  if (p.value_number !== null) return String(p.value_number);
  if (p.value_text !== null) return p.value_text;
  if (p.value_enum !== null) return p.value_enum;
  return null;
}

/** Curate a client-safe view. Outcomes are ONLY computed/derived parameters,
 * labelled by the neutral field SYMBOL (never label_de / the question text and
 * never a formula). Pure — all IO happens in the calling server action. */
export function buildClientProjectView(input: {
  project: { name: string; project_code: string | null; location: string | null };
  params: CurationParam[];
  fieldsById: Record<string, CurationField>;
  instances: CurationInstance[];
}): ClientProjectView {
  const outcomes = input.params
    .filter((p) => CLIENT_VISIBLE_SOURCE_TYPES.has(p.source_type))
    .map((p) => {
      const field = input.fieldsById[p.field_id];
      const value = paramValue(p);
      if (!field || value === null) return null;
      return { label: field.symbol, value, unit: field.unit };
    })
    .filter((o): o is { label: string; value: string; unit: string | null } => o !== null);

  const total = input.instances.length;
  const approved = input.instances.filter((i) => APPROVED_STATUSES.has(i.status)).length;
  const percent = total === 0 ? 0 : Math.round((approved / total) * 100);

  return {
    project: {
      name: input.project.name,
      code: input.project.project_code,
      location: input.project.location,
    },
    outcomes,
    progress: { worksheetsTotal: total, worksheetsApproved: approved, percent },
  };
}
