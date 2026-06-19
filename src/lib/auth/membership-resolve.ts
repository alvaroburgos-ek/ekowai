export type OrgRole = 'owner' | 'admin' | 'engineer' | 'viewer';
export type ExternalRole = 'client' | 'designer';

export type Membership =
  | { kind: 'staff'; orgRole: OrgRole }
  | { kind: 'external'; projectId: string; role: ExternalRole }
  | null;

/** Pure precedence rule. Staff (org_members) wins over external
 * (project_members): a user with both rows counts as staff, so an engineer can
 * never be downgraded into a portal by a stray project_members row. */
export function resolveMembership(
  orgRow: { role: OrgRole } | null,
  pmRow: { project_id: string; role: ExternalRole } | null,
): Membership {
  if (orgRow) return { kind: 'staff', orgRole: orgRow.role };
  if (pmRow) return { kind: 'external', projectId: pmRow.project_id, role: pmRow.role };
  return null;
}
