/** Lead lifecycle status. Mirrors the `leads.status` text column (no DB CHECK
 * constraint — enforced here at the app layer). A lead arrives as `new`, an
 * engineer marks it `contacted`, converts it to a project (`converted`), or
 * dismisses it (`archived`). */
export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'archived'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Filter value for the /leads list — the statuses plus an "all" pseudo-filter. */
export const LEAD_FILTERS = ['new', 'contacted', 'converted', 'archived', 'all'] as const;
export type LeadFilter = (typeof LEAD_FILTERS)[number];

export function isLeadStatus(v: string | null | undefined): v is LeadStatus {
  return !!v && (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isLeadFilter(v: string | null | undefined): v is LeadFilter {
  return !!v && (LEAD_FILTERS as readonly string[]).includes(v);
}
