import { SITE_PROFILE_ENTRIES, type SiteProfileEntry } from './symbol-map';

/** All form-field name prefixes used for site-profile inputs. */
const FORM_PREFIX = 'site_profile.';

export function siteProfileFieldName(entry: SiteProfileEntry): string {
  return `${FORM_PREFIX}${entry.key}`;
}

/**
 * Pull every `site_profile.<key>` entry out of a FormData payload and assemble
 * a typed JSON object suitable for `projects.site_profile`. Empty inputs map
 * to omitted keys (we don't store empty strings). Unknown keys are ignored.
 */
export function readSiteProfileFromFormData(formData: FormData): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const entry of SITE_PROFILE_ENTRIES) {
    const raw = formData.get(siteProfileFieldName(entry));
    if (raw == null) continue;
    const s = String(raw).trim();
    if (s === '') continue;
    if (entry.type === 'number') {
      const n = Number(s);
      if (Number.isFinite(n)) out[entry.key] = n;
    } else {
      out[entry.key] = s;
    }
  }
  return out;
}

/** Lookup a value by key out of a stored site_profile JSON blob (defensive). */
export function readSiteProfileValue(siteProfile: unknown, key: string): string {
  if (!siteProfile || typeof siteProfile !== 'object') return '';
  const v = (siteProfile as Record<string, unknown>)[key];
  if (v == null) return '';
  return String(v);
}
