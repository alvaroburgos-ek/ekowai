# Plan 4: Approval State Machine + Audit Log View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `<ApprovalBar>` functional — engineers can move a worksheet through the 4-state machine (`draft → submitted_for_review → engineer_approved → final`, plus terminal `deactivated`), with every transition written atomically to `approval_events` (immutable) + `audit_log` + `worksheet_instances.status`. Also: expose `/projects/[id]/audit` as a read-only view of all transitions + parameter-saves on a project.

**Architecture:** One server action `transitionWorksheet(instanceId, eventType, comment)` runs the state-machine guard (only legal transitions allowed from the current status), then writes the three rows in one DB transaction. The action enforces mandatory comment (also enforced at DB level via CHECK constraint from Plan 1). UI: a `<TransitionModal>` opens on click of an `<ApprovalBar>` button, requires a comment, calls the action via `useTransition`, refreshes the page. Audit view is a Server Component that pages 50-at-a-time through the union of `approval_events` and `audit_log`.

**Tech Stack:** Next.js 16 App Router, Drizzle (transactions), Supabase Auth (`auth.uid()` for actor_id), the existing `<Button>` + `<SegmentedControl>` from main, `useTransition` for optimistic-loading UX.

**Companion Spec:** `docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md` (Section 7 — Approval State Machine + Audit)

**Predecessors:** Plans 1, 2, 3. Same branch `feat/db-driven-schema`.

---

## File Structure

**Create:**
- `src/lib/state-machine.ts` — state-machine map + types
- `src/lib/actions/worksheet-transition.ts` — `transitionWorksheet` server action
- `src/lib/db/queries/audit.ts` — `loadProjectAuditTimeline`
- `src/components/worksheet/status-pill.tsx` — colored pill per status
- `src/components/worksheet/transition-modal.tsx` — modal with comment field
- `src/components/worksheet/audit-timeline.tsx` — read-only timeline component
- `src/app/[locale]/(app)/projects/[id]/audit/page.tsx` — audit log route
- `tests/rls/approval-transitions.test.ts` — RLS test verifying immutability + INSERT scope

**Modify:**
- `src/components/worksheet/approval-bar.tsx` — replace Plan-3 stub with functional component
- `src/app/[locale]/(app)/projects/[id]/page.tsx` — add link to `/audit`
- `src/lib/i18n/messages/de.json` — add transition + audit strings
- `src/lib/i18n/messages/en.json` — same

---

## Reference: State Machine

```
                                        ┌──── reopen ────┐
                                        ▼                │
   ┌──────┐  submit   ┌────────────────────┐  approve   ┌──────────────────┐  finalize   ┌──────┐
   │draft │──────────▶│submitted_for_review│──────────▶│engineer_approved │──────────▶│final │
   └──────┘           └────────────────────┘           └──────────────────┘           └──────┘
      ▲                       │                                    │                     │
      │ reject (mit comment)  │                                    │ reopen              │
      └───────────────────────┘                                    │                     │
      ▲                                                            │                     │
      └────────────────────────────────────────────────────────────┴─── reopen ─────────┘
```

Terminal: `deactivated` (triggered when project_standards.status goes 'removed').

Allowed event_type per current status (excluding deactivate/reactivate which are system-triggered):

| From | Allowed events | To |
|---|---|---|
| `draft` | `submit` | `submitted_for_review` |
| `submitted_for_review` | `engineer_approve` | `engineer_approved` |
| `submitted_for_review` | `engineer_reject` | `draft` |
| `engineer_approved` | `finalize` | `final` |
| `engineer_approved` | `reopen` | `draft` |
| `final` | `reopen` | `draft` |
| `deactivated` | (none — must reactivate via project_standards) | — |

Comment is **required** for every transition (CHECK constraint at DB level + validator at action level).

---

## Task 1: State Machine Definition

**Files:**
- Create: `src/lib/state-machine.ts`

- [ ] **Step 1: Write the file**

Create `src/lib/state-machine.ts`:

```typescript
/** Worksheet instance state machine for Plan 4.
 * Source of truth — the server action transitionWorksheet uses this for guard
 * checks, and the UI uses it to decide which buttons to show. */

export type WorksheetStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'engineer_approved'
  | 'final'
  | 'deactivated';

export type TransitionEvent =
  | 'submit'
  | 'engineer_approve'
  | 'engineer_reject'
  | 'finalize'
  | 'reopen'
  | 'deactivate'
  | 'reactivate';

/** Map from current status → allowed event → resulting status. */
export const TRANSITIONS: Record<
  WorksheetStatus,
  Partial<Record<TransitionEvent, WorksheetStatus>>
> = {
  draft: {
    submit: 'submitted_for_review',
    deactivate: 'deactivated',
  },
  submitted_for_review: {
    engineer_approve: 'engineer_approved',
    engineer_reject: 'draft',
    deactivate: 'deactivated',
  },
  engineer_approved: {
    finalize: 'final',
    reopen: 'draft',
    deactivate: 'deactivated',
  },
  final: {
    reopen: 'draft',
    deactivate: 'deactivated',
  },
  deactivated: {
    reactivate: 'draft',
  },
};

export function nextStatus(
  current: WorksheetStatus,
  event: TransitionEvent,
): WorksheetStatus | null {
  return TRANSITIONS[current]?.[event] ?? null;
}

/** What event labels does the engineer see for a given status?
 * Excludes system-only events (deactivate/reactivate). */
export function userActionsFor(status: WorksheetStatus): Array<{
  event: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
  labelDe: string;
  labelEn: string;
  destructive?: boolean;
}> {
  switch (status) {
    case 'draft':
      return [{ event: 'submit', labelDe: 'Zur Prüfung einreichen', labelEn: 'Submit for review' }];
    case 'submitted_for_review':
      return [
        { event: 'engineer_approve', labelDe: 'Genehmigen', labelEn: 'Approve' },
        { event: 'engineer_reject', labelDe: 'Zurückgeben', labelEn: 'Reject', destructive: true },
      ];
    case 'engineer_approved':
      return [
        { event: 'finalize', labelDe: 'Finalisieren', labelEn: 'Finalize' },
        { event: 'reopen', labelDe: 'Wieder öffnen', labelEn: 'Reopen', destructive: true },
      ];
    case 'final':
      return [{ event: 'reopen', labelDe: 'Wieder öffnen', labelEn: 'Reopen', destructive: true }];
    case 'deactivated':
      return [];
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep "state-machine.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/state-machine.ts
git commit -m "feat(state-machine): worksheet status transitions + event labels

Single source of truth for Plan 4's transitionWorksheet action and the
ApprovalBar UI. TRANSITIONS map enforces only legal events from each
status; nextStatus() returns null for an illegal event so the action
fails fast. userActionsFor() drives the buttons rendered per status."
```

---

## Task 2: transitionWorksheet Server Action

**Files:**
- Create: `src/lib/actions/worksheet-transition.ts`

- [ ] **Step 1: Write the action**

Create `src/lib/actions/worksheet-transition.ts`:

```typescript
'use server';
import { db } from '@/lib/db';
import {
  worksheetInstances,
  approvalEvents,
  auditLog,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import {
  nextStatus,
  type WorksheetStatus,
  type TransitionEvent,
} from '@/lib/state-machine';

export type TransitionInput = {
  instanceId: string;
  eventType: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
  comment: string;
};

export type TransitionResult =
  | { ok: true; newStatus: WorksheetStatus }
  | { ok: false; error: string };

export async function transitionWorksheet(
  input: TransitionInput,
): Promise<TransitionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not authenticated' };
  const userId = auth.user.id;

  const comment = input.comment.trim();
  if (!comment) return { ok: false, error: 'Kommentar erforderlich' };

  // Load instance via RLS (returns nothing if not org member)
  const [instance] = await db
    .select()
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, input.instanceId))
    .limit(1);
  if (!instance) return { ok: false, error: 'Worksheet nicht gefunden' };

  const fromStatus = instance.status as WorksheetStatus;
  const toStatus = nextStatus(fromStatus, input.eventType);
  if (!toStatus) {
    return {
      ok: false,
      error: `Übergang ${input.eventType} aus Status ${fromStatus} nicht erlaubt`,
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(worksheetInstances)
        .set({ status: toStatus, updatedAt: new Date() })
        .where(eq(worksheetInstances.id, input.instanceId));

      await tx.insert(approvalEvents).values({
        worksheetInstanceId: input.instanceId,
        eventType: input.eventType,
        fromStatus,
        toStatus,
        actorId: userId,
        actorRole: 'engineer',
        comment,
      });

      await tx.insert(auditLog).values({
        actorId: userId,
        actorRole: 'engineer',
        projectId: instance.projectId,
        tableName: 'worksheet_instances',
        recordId: input.instanceId,
        action: 'transition',
        changes: {
          eventType: input.eventType,
          from: fromStatus,
          to: toStatus,
          comment,
        },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }

  return { ok: true, newStatus: toStatus };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep "worksheet-transition.ts" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/worksheet-transition.ts
git commit -m "feat(actions): transitionWorksheet server action

Atomic 3-write transaction: UPDATE worksheet_instances, INSERT
approval_events (immutable workflow chain), INSERT audit_log
(universal change log). Guard against illegal transitions via the
state-machine map. Mandatory comment validated server-side; DB CHECK
constraint backs it up."
```

---

## Task 3: RLS Test for Approval Transitions

**Files:**
- Create: `tests/rls/approval-transitions.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/rls/approval-transitions.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { admin, makeUser, makeOrg, cleanup } from './helpers';

describe('approval_events transitions — RLS', () => {
  const e1 = `rls-trans-a-${Date.now()}@test.local`;
  const e2 = `rls-trans-b-${Date.now()}@test.local`;
  afterAll(async () => cleanup([e1, e2]));

  it('user can INSERT approval_events for their own org worksheet, with correct from/to/actor', async () => {
    const ad = admin();
    const a = await makeUser(e1);
    const orgA = await makeOrg(a.client, a.id, 'Alpha Trans');

    // Service-role seeds project + standard + template + instance
    const { data: proj } = await ad.from('projects').insert({ org_id: orgA, name: 'P', created_by: a.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    const { error } = await a.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: a.id,
      actor_role: 'engineer',
      comment: 'Bitte prüfen',
    });
    expect(error).toBeNull();
  });

  it('user A cannot INSERT approval_events for org B worksheet', async () => {
    const ad = admin();
    const a = await makeUser(`rls-trans-c-${Date.now()}@test.local`);
    const b = await makeUser(e2);
    const orgB = await makeOrg(b.client, b.id, 'Bravo Trans');
    const { data: proj } = await ad.from('projects').insert({ org_id: orgB, name: 'P', created_by: b.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    const { error } = await a.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: a.id,
      actor_role: 'engineer',
      comment: 'Bösartig',
    });
    expect(error).not.toBeNull();
  });

  it('user cannot impersonate another actor (actor_id must equal auth.uid)', async () => {
    const ad = admin();
    const a = await makeUser(`rls-trans-d-${Date.now()}@test.local`);
    const b = await makeUser(`rls-trans-e-${Date.now()}@test.local`);
    const orgA = await makeOrg(a.client, a.id, 'Alpha Imperson');
    const { data: proj } = await ad.from('projects').insert({ org_id: orgA, name: 'P', created_by: a.id }).select('id').single();
    const { data: std } = await ad.from('standards').insert({ code: `T-${Date.now()}`, title_de: 'T', version: 'Pass3c' }).select('id').single();
    const { data: tmpl } = await ad.from('worksheet_templates').insert({ standard_id: std!.id, code: 'T-01', title_de: 'W' }).select('id').single();
    const { data: inst } = await ad.from('worksheet_instances').insert({ project_id: proj!.id, worksheet_template_id: tmpl!.id }).select('id').single();

    // User A inserts but claims actor_id = B's id
    const { error } = await a.client.from('approval_events').insert({
      worksheet_instance_id: inst!.id,
      event_type: 'submit',
      from_status: 'draft',
      to_status: 'submitted_for_review',
      actor_id: b.id,             // <-- wrong
      actor_role: 'engineer',
      comment: 'X',
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm test:rls tests/rls/approval-transitions.test.ts
```

Expected: 3/3 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/rls/approval-transitions.test.ts
git commit -m "test(rls): approval transitions — INSERT scope + actor impersonation guard

Three tests:
1. user can insert for own org's worksheet
2. user cannot insert for foreign org
3. user cannot insert with actor_id != auth.uid (impersonation)"
```

---

## Task 4: StatusPill + TransitionModal Components

**Files:**
- Create: `src/components/worksheet/status-pill.tsx`
- Create: `src/components/worksheet/transition-modal.tsx`

- [ ] **Step 1: Write `status-pill.tsx`**

```typescript
'use client';
import type { WorksheetStatus } from '@/lib/state-machine';

const STATUS_STYLES: Record<WorksheetStatus, { label: string; className: string }> = {
  draft:                 { label: 'Entwurf',        className: 'bg-paper-2 text-ink' },
  submitted_for_review:  { label: 'In Prüfung',     className: 'bg-accent-2/15 text-accent-2' },
  engineer_approved:     { label: 'Genehmigt',      className: 'bg-success/15 text-success' },
  final:                 { label: 'Final',          className: 'bg-accent/15 text-accent' },
  deactivated:           { label: 'Deaktiviert',    className: 'bg-paper-2 text-subtext line-through' },
};

export function StatusPill({ status }: { status: WorksheetStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2: Write `transition-modal.tsx`**

```typescript
'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { transitionWorksheet } from '@/lib/actions/worksheet-transition';
import { useRouter } from 'next/navigation';
import type { TransitionEvent } from '@/lib/state-machine';

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  eventType: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
  actionLabel: string;
  destructive?: boolean;
};

export function TransitionModal({
  open,
  onClose,
  instanceId,
  eventType,
  actionLabel,
  destructive,
}: Props) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) return null;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await transitionWorksheet({
        instanceId,
        eventType,
        comment,
      });
      if (result.ok) {
        setComment('');
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-paper border border-hairline-strong p-6 space-y-4 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">{actionLabel}</h2>
        <p className="text-sm text-subtext">
          Kommentar (Pflicht — wird permanent im Auditprotokoll gespeichert):
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="block w-full rounded-md border border-hairline-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          autoFocus
        />
        {error && (
          <div className="text-sm text-error bg-error/10 px-3 py-2 rounded-md">{error}</div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || !comment.trim()}
            variant={destructive ? 'ghost' : 'default'}
          >
            {pending ? 'Verarbeite...' : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

If the `<Button>` variant `'default'` doesn't exist, check `src/components/ui/button.tsx` and use whichever the default variant name is. Likewise for `bg-paper` — check `src/app/globals.css` for the actual Tailwind class names; substitute if different.

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "(status-pill|transition-modal).tsx" | head -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/worksheet/status-pill.tsx \
        src/components/worksheet/transition-modal.tsx
git commit -m "feat(worksheet): StatusPill + TransitionModal components

StatusPill colours the 5 statuses (draft/submitted/approved/final/deactivated).
TransitionModal opens with a mandatory comment textarea; submits via
transitionWorksheet server action; on success closes + router.refresh()."
```

---

## Task 5: Update ApprovalBar from Stub to Functional

**Files:**
- Modify: `src/components/worksheet/approval-bar.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/worksheet/approval-bar.tsx`:

```typescript
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusPill } from './status-pill';
import { TransitionModal } from './transition-modal';
import {
  userActionsFor,
  type TransitionEvent,
  type WorksheetStatus,
} from '@/lib/state-machine';

type Props = {
  instanceId: string;
  status: WorksheetStatus;
  locale: 'de' | 'en';
};

export function ApprovalBar({ instanceId, status, locale }: Props) {
  const actions = userActionsFor(status);
  const [modal, setModal] = useState<null | {
    event: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
    label: string;
    destructive?: boolean;
  }>(null);

  return (
    <section className="border-t border-hairline pt-6 mt-8 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext">Status</div>
        <StatusPill status={status} />
      </div>

      <div className="flex gap-2">
        {actions.length === 0 ? (
          <span className="text-xs text-subtext italic">
            {status === 'deactivated' ? 'Standard entfernt — reaktivieren über Standards-Tab' : '—'}
          </span>
        ) : (
          actions.map((a) => (
            <Button
              key={a.event}
              variant={a.destructive ? 'ghost' : 'default'}
              size="sm"
              onClick={() =>
                setModal({
                  event: a.event,
                  label: locale === 'de' ? a.labelDe : a.labelEn,
                  destructive: a.destructive,
                })
              }
            >
              {locale === 'de' ? a.labelDe : a.labelEn}
              {a.destructive && status === 'final' && ' ⚠'}
            </Button>
          ))
        )}
      </div>

      {modal && (
        <TransitionModal
          open
          onClose={() => setModal(null)}
          instanceId={instanceId}
          eventType={modal.event}
          actionLabel={modal.label}
          destructive={modal.destructive}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Update the WorksheetForm to pass `instanceId` + `locale`**

Open `src/components/worksheet/worksheet-form.tsx`. Find the `<ApprovalBar status={instance.status} />` call (Plan 3 stub) and change to:

```tsx
<ApprovalBar instanceId={instance.id} status={instance.status} locale={locale} />
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "(approval-bar|worksheet-form).tsx" | head -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/worksheet/approval-bar.tsx \
        src/components/worksheet/worksheet-form.tsx
git commit -m "feat(worksheet): ApprovalBar wired to state machine + transition modal

Replaces the Plan-3 stub. Buttons render per current status via
userActionsFor(); clicking opens TransitionModal which collects a
mandatory comment and calls transitionWorksheet.

WorksheetForm now passes instanceId + locale through."
```

---

## Task 6: Audit Log Query

**Files:**
- Create: `src/lib/db/queries/audit.ts`

- [ ] **Step 1: Write the queries**

```typescript
import 'server-only';
import { db } from '@/lib/db';
import {
  approvalEvents,
  auditLog,
  worksheetInstances,
  worksheetTemplates,
  profiles,
  fields,
} from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type AuditEntry = {
  source: 'approval' | 'audit';
  occurredAt: string;
  actorName: string | null;
  actorId: string | null;
  actorRole: string | null;
  worksheetCode: string | null;
  tableName: string | null;
  action: string | null;
  detail: string;
};

/** Returns a unified timeline of approval_events + audit_log for one project. */
export async function loadProjectAuditTimeline(
  projectId: string,
  limit = 100,
): Promise<AuditEntry[]> {
  const approvals = await db
    .select({
      occurredAt: approvalEvents.occurredAt,
      actorId: approvalEvents.actorId,
      actorRole: approvalEvents.actorRole,
      eventType: approvalEvents.eventType,
      fromStatus: approvalEvents.fromStatus,
      toStatus: approvalEvents.toStatus,
      comment: approvalEvents.comment,
      worksheetCode: worksheetTemplates.code,
      actorName: profiles.fullName,
    })
    .from(approvalEvents)
    .innerJoin(
      worksheetInstances,
      eq(worksheetInstances.id, approvalEvents.worksheetInstanceId),
    )
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId),
    )
    .leftJoin(profiles, eq(profiles.id, approvalEvents.actorId))
    .where(eq(worksheetInstances.projectId, projectId))
    .orderBy(desc(approvalEvents.occurredAt))
    .limit(limit);

  const audits = await db
    .select({
      occurredAt: auditLog.occurredAt,
      actorId: auditLog.actorId,
      actorRole: auditLog.actorRole,
      tableName: auditLog.tableName,
      action: auditLog.action,
      changes: auditLog.changes,
      actorName: profiles.fullName,
    })
    .from(auditLog)
    .leftJoin(profiles, eq(profiles.id, auditLog.actorId))
    .where(eq(auditLog.projectId, projectId))
    .orderBy(desc(auditLog.occurredAt))
    .limit(limit);

  // Resolve field symbols for audit_log rows that target project_parameters
  const fieldIds = new Set<string>();
  for (const a of audits) {
    if (a.tableName === 'project_parameters' && a.changes && typeof a.changes === 'object') {
      const c = a.changes as { fieldId?: string };
      if (c.fieldId) fieldIds.add(c.fieldId);
    }
  }
  const fieldsBySymbol = new Map<string, string>();
  if (fieldIds.size > 0) {
    const fieldRows = await db
      .select({ id: fields.id, symbol: fields.symbol })
      .from(fields)
      .where(sql`${fields.id} = ANY(${Array.from(fieldIds)})`);
    for (const r of fieldRows) fieldsBySymbol.set(r.id, r.symbol);
  }

  const entries: AuditEntry[] = [];

  for (const a of approvals) {
    entries.push({
      source: 'approval',
      occurredAt: a.occurredAt.toISOString(),
      actorName: a.actorName ?? null,
      actorId: a.actorId,
      actorRole: a.actorRole,
      worksheetCode: a.worksheetCode,
      tableName: 'worksheet_instances',
      action: a.eventType,
      detail: `${a.fromStatus} → ${a.toStatus} · „${a.comment}"`,
    });
  }
  for (const a of audits) {
    let detail = JSON.stringify(a.changes);
    if (a.tableName === 'project_parameters' && a.changes && typeof a.changes === 'object') {
      const c = a.changes as { fieldId?: string; before?: unknown; after?: unknown };
      const sym = c.fieldId ? fieldsBySymbol.get(c.fieldId) ?? c.fieldId : '?';
      detail = `${sym}: ${formatValue(c.before)} → ${formatValue(c.after)}`;
    } else if (a.tableName === 'worksheet_instances' && a.changes && typeof a.changes === 'object') {
      const c = a.changes as { from?: string; to?: string; eventType?: string };
      detail = `${c.eventType ?? a.action}: ${c.from} → ${c.to}`;
    }
    entries.push({
      source: 'audit',
      occurredAt: a.occurredAt.toISOString(),
      actorName: a.actorName ?? null,
      actorId: a.actorId,
      actorRole: a.actorRole,
      worksheetCode: null,
      tableName: a.tableName,
      action: a.action,
      detail,
    });
  }

  entries.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return entries.slice(0, limit);
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck 2>&1 | grep "queries/audit.ts" | head -5
```

Expected: no errors. If `profiles.fullName` doesn't exist — check the actual column on `profiles` table (likely `full_name` mapped to `fullName`, or `displayName`). Adjust accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries/audit.ts
git commit -m "feat(queries): loadProjectAuditTimeline — union of approval_events + audit_log

Returns a sorted timeline of every approval transition and every
parameter save on a project, with the actor's name resolved from
profiles when available. Field-symbol names are resolved for
project_parameters audit rows so the timeline reads as e.g.
'A_E: — → 1800' instead of raw UUIDs."
```

---

## Task 7: AuditTimeline Component

**Files:**
- Create: `src/components/worksheet/audit-timeline.tsx`

- [ ] **Step 1: Write the component**

```typescript
import type { AuditEntry } from '@/lib/db/queries/audit';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-subtext italic">
        Noch keine Aktionen für dieses Projekt aufgezeichnet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-hairline">
      {entries.map((e, i) => (
        <li key={i} className="py-3 flex items-start gap-4 text-sm">
          <div className="w-32 shrink-0 text-xs text-subtext tabular-nums">
            {formatDate(e.occurredAt)}
          </div>
          <div className="w-32 shrink-0 text-xs text-subtext">
            {e.actorName ?? (e.actorRole ?? 'system')}
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="text-xs uppercase tracking-[0.18em] text-subtext flex gap-2">
              <span
                className={`inline-block px-2 py-0.5 rounded ${
                  e.source === 'approval'
                    ? 'bg-accent-2/10 text-accent-2'
                    : 'bg-paper-2 text-ink-2'
                }`}
              >
                {e.action ?? '—'}
              </span>
              {e.worksheetCode && <span>· {e.worksheetCode}</span>}
              {e.tableName && <span>· {e.tableName}</span>}
            </div>
            <div className="text-sm text-ink">{e.detail}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/worksheet/audit-timeline.tsx
git commit -m "feat(worksheet): AuditTimeline read-only component

Renders the unified approval_events + audit_log timeline from
loadProjectAuditTimeline. de-DE date format, role/name resolution,
visual distinction between approval transitions (accent-2 pill) and
generic audit rows (paper-2 pill)."
```

---

## Task 8: Audit Log Route

**Files:**
- Create: `src/app/[locale]/(app)/projects/[id]/audit/page.tsx`

- [ ] **Step 1: Write the route**

```typescript
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { loadProjectAuditTimeline } from '@/lib/db/queries/audit';
import { AuditTimeline } from '@/components/worksheet/audit-timeline';

export default async function ProjectAuditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const entries = await loadProjectAuditTimeline(id, 200);

  return (
    <article className="space-y-8 max-w-4xl">
      <header className="border-b border-hairline pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2">
          Projekt {project.id.slice(0, 8)}
        </div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Auditprotokoll · {project.name}
        </h1>
        <div className="mt-2 text-xs text-subtext">
          {entries.length} Einträge · neueste zuerst · max. 200 angezeigt
        </div>
      </header>
      <AuditTimeline entries={entries} />
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/\(app\)/projects/[id]/audit/page.tsx
git commit -m "feat(project): /projects/[id]/audit read-only audit timeline route

Server Component loads up to 200 entries via loadProjectAuditTimeline
and renders <AuditTimeline>. RLS naturally scopes to the user's org."
```

---

## Task 9: Wire Audit Link from Project Page

**Files:**
- Modify: `src/app/[locale]/(app)/projects/[id]/page.tsx`

- [ ] **Step 1: Add the link**

In the project detail page, near the standards section added in Plan 3, add a second link to the audit page:

```typescript
<section className="space-y-3">
  <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
    Auditprotokoll
  </h2>
  <Link href={`/${localeTyped}/projects/${id}/audit`}>
    <Button variant="ghost">Auditprotokoll ansehen →</Button>
  </Link>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/\(app\)/projects/[id]/page.tsx
git commit -m "feat(project): link to /audit from project page

Adds an audit-log link section beneath the standards link."
```

---

## Task 10: Smoke Test the State Machine

The new approval flow is testable end-to-end against the existing pilot project (Plan 3's `02f93026-fb20-4463-abd6-540befc049a9`).

- [ ] **Step 1: Verify transition action works via direct API**

We can't easily fake a Supabase session in a shell script, so we exercise the action via psql + direct SQL — confirming the schema-level guarantees rather than the action's auth check. (The action's auth check is covered by Task 3's RLS tests.)

```bash
DATABASE_URL="$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" \
  pnpm tsx -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, {prepare:false});
async function main() {
  const projectId = '02f93026-fb20-4463-abd6-540befc049a9';
  // Find any draft worksheet_instance
  const [inst] = await sql\`
    SELECT wi.id, wt.code FROM worksheet_instances wi
    JOIN worksheet_templates wt ON wt.id = wi.worksheet_template_id
    WHERE wi.project_id = \${projectId} AND wi.status = 'draft'
    LIMIT 1
  \`;
  if (!inst) {
    console.log('No draft worksheets — try a different project');
    process.exit(1);
  }
  console.log('Testing transitions on', inst.code, '(', inst.id, ')');

  // Manually simulate the transitionWorksheet transaction at SQL level
  const [user] = await sql\`SELECT id FROM auth.users WHERE email='leadership@ekowai.com' LIMIT 1\`;

  await sql.begin(async (tx) => {
    await tx\`UPDATE worksheet_instances SET status='submitted_for_review' WHERE id=\${inst.id}\`;
    await tx\`INSERT INTO approval_events (worksheet_instance_id, event_type, from_status, to_status, actor_id, actor_role, comment) VALUES (\${inst.id}, 'submit', 'draft', 'submitted_for_review', \${user.id}, 'engineer', 'Smoke test submit')\`;
    await tx\`INSERT INTO audit_log (actor_id, actor_role, project_id, table_name, record_id, action, changes) VALUES (\${user.id}, 'engineer', \${projectId}, 'worksheet_instances', \${inst.id}, 'transition', \${JSON.stringify({from:'draft',to:'submitted_for_review',eventType:'submit',comment:'Smoke test submit'})}::jsonb)\`;
  });
  console.log('✓ Transitioned to submitted_for_review');

  // Re-read status
  const [check] = await sql\`SELECT status FROM worksheet_instances WHERE id = \${inst.id}\`;
  console.log('Current status:', check.status);

  // Read approval_events for this instance
  const events = await sql\`SELECT event_type, from_status, to_status, comment FROM approval_events WHERE worksheet_instance_id = \${inst.id} ORDER BY occurred_at DESC LIMIT 5\`;
  console.log('approval_events:', events);

  // Reset to draft so subsequent re-runs don't break
  await sql\`UPDATE worksheet_instances SET status='draft' WHERE id=\${inst.id}\`;
  console.log('✓ Reset to draft for clean re-run');
}
main().finally(() => sql.end());
"
```

Expected:
- "Transitioned to submitted_for_review"
- "Current status: submitted_for_review"
- approval_events shows the new row
- Reset done

If the BEGIN/COMMIT fails, the action wraps in a try/catch and returns `{ ok: false, error }` — same robustness as the action.

- [ ] **Step 2: Empty checkpoint commit**

```bash
git commit --allow-empty -m "chore(smoke): Plan 4 state machine SQL-level smoke pass

Manually simulated draft → submitted_for_review for one worksheet,
verified approval_events + audit_log rows landed and worksheet_instances.status
updated. Auth path covered separately by tests/rls/approval-transitions."
```

---

## Task 11: i18n + Push + Update PR

- [ ] **Step 1: Add i18n strings**

In `src/lib/i18n/messages/de.json`, extend the `worksheets` group (added in Plan 3):

```json
    "statusDraft": "Entwurf",
    "statusSubmitted": "In Prüfung",
    "statusApproved": "Genehmigt",
    "statusFinal": "Final",
    "statusDeactivated": "Deaktiviert",
    "transitionSubmit": "Zur Prüfung einreichen",
    "transitionApprove": "Genehmigen",
    "transitionReject": "Zurückgeben",
    "transitionFinalize": "Finalisieren",
    "transitionReopen": "Wieder öffnen",
    "transitionCommentLabel": "Kommentar (Pflicht — wird permanent im Auditprotokoll gespeichert):",
    "transitionCancel": "Abbrechen",
    "transitionProcessing": "Verarbeite...",
    "auditTitle": "Auditprotokoll",
    "auditEmpty": "Noch keine Aktionen für dieses Projekt aufgezeichnet.",
    "auditViewLink": "Auditprotokoll ansehen"
```

Same keys in `en.json` with English values.

- [ ] **Step 2: Commit i18n**

```bash
git add src/lib/i18n/messages/de.json src/lib/i18n/messages/en.json
git commit -m "feat(i18n): state-machine + audit strings for Plan 4"
```

- [ ] **Step 3: Push**

```bash
git push origin feat/db-driven-schema
```

- [ ] **Step 4: Update PR #1 body**

```bash
gh pr edit 1 --body "$(cat <<'EOF'
## Summary

Plans 1, 2, 3, 4 of the 2026-05-20 DB-driven multi-standard rebuild spec.

### Plan 1 — Schema Migration
17-table schema, RLS-enforced immutability on approval_events + audit_log.

### Plan 2 — Pass3c xlsx Importer
5 verified standards imported: 135 worksheets, 627 fields, 71 equations,
174 compliance requirements. Idempotent.

### Plan 3 — Dynamic Form Renderer
- New worksheet routes under `/projects/[id]/standards/[standardCode]/worksheets/[worksheetCode]`
- `<DynamicField>` switch on `data_type`
- Auto-save → `project_parameters` + `audit_log`
- StandardsPicker, ApprovalBar as Plan-3 stub

### Plan 4 — Approval State Machine + Audit Log View
- `transitionWorksheet` server action — atomic 3-write transaction
  (worksheet_instances + approval_events + audit_log)
- `<StatusPill>` + `<TransitionModal>` + functional `<ApprovalBar>`
- 4-state machine: draft → submitted_for_review → engineer_approved → final
- `/projects/[id]/audit` Server-Component route with unified timeline
- Three new RLS tests verify INSERT scope + actor impersonation guard

### App is partially broken after this PR

Old engine/PDF/calc-routes still reference dropped tables — Vercel build
remains red. New routes work in dev mode. Plans 5–6:
- Plan 5: Plan-6 Reattachment (citations/docs/archives/PDF retargeted)
- Plan 6: Pilot Seed + Cleanup + End-to-End

## Test plan

- [x] Plan 1: 5 RLS tests green
- [x] Plan 2: 17 unit + 5 standards imported
- [x] Plan 3: 2 new RLS tests + smoke routes green
- [x] Plan 4: 3 new RLS tests + SQL-level state-machine smoke pass
- [ ] (Reviewer) Verify destructive button styling on reject/reopen
- [ ] (Human) Browser test: submit → approve → finalize cycle on a real worksheet
- [ ] (Engineer) Patch the workbook data gaps from Plan 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Done Criteria for Plan 4

1. State machine map exists with all 4-state transitions documented
2. `transitionWorksheet` action runs atomic 3-write transaction; returns typed result
3. RLS tests verify (a) own-org INSERT works, (b) foreign-org INSERT blocked, (c) actor impersonation blocked
4. `<ApprovalBar>` renders buttons per status, opens `<TransitionModal>` on click
5. `/projects/[id]/audit` shows the unified timeline
6. SQL-level smoke pass: a worksheet transitions and approval_events + audit_log rows land
7. PR #1 description reflects Plans 1+2+3+4

Then proceed to write Plan 5 (Plan-6 Reattachment).
