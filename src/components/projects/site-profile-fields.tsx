import { SITE_PROFILE_ENTRIES, type SiteProfileEntry } from '@/lib/site-profile/symbol-map';
import { siteProfileFieldName, readSiteProfileValue } from '@/lib/site-profile/form-helpers';
import { Input } from '@/components/ui/input';

type Props = {
  /** Existing project.site_profile (JSONB) — null/undefined for the create form. */
  initial?: unknown;
};

/**
 * Renders the project-level Standortprofil inputs. Source of truth for which
 * inputs appear is `SITE_PROFILE_ENTRIES` — adding an entry there shows it
 * here automatically and wires it through to the worksheet symbol map.
 *
 * Inputs are grouped into:
 *   1. Standort & Geo (lat/lon/Adresse/Gemeinde/Bundesland/KOSTRA)
 *   2. Boden & Hydrogeologie (soil/k_f/MHGW)
 *   3. Projektbeteiligte (Bauherr Ansprechperson, Planungsbüro, …)
 */
export function SiteProfileFields({ initial }: Props) {
  const groups: Array<{ titleDe: string; keys: string[] }> = [
    {
      titleDe: 'Standort & Geo',
      keys: ['site_address', 'site_municipality', 'site_bundesland', 'site_lat', 'site_lon', 'kostra_grid_cell'],
    },
    {
      titleDe: 'Boden & Hydrogeologie',
      keys: ['soil_classification', 'k_f', 'mhgw'],
    },
    {
      titleDe: 'Projektbeteiligte & Behörde',
      keys: ['project_number', 'planner_firm', 'planner_name', 'client_contact', 'wasserbehoerde'],
    },
  ];
  const entryByKey = new Map(SITE_PROFILE_ENTRIES.map((e) => [e.key, e]));

  return (
    <div className="space-y-8">
      <p className="text-xs text-subtext leading-relaxed border-l-2 border-hairline pl-3">
        Diese Standort- und Projektdaten füllen passende Felder in den
        Arbeitsblättern automatisch vor (z.B. KOSTRA-Zelle → A138-04, k_f → A138-05).
        Vorbefüllte Felder erscheinen mit Hinweis &bdquo;Projekt-Standort&ldquo; und
        sind im Arbeitsblatt jederzeit überschreibbar.
      </p>
      {groups.map((g) => (
        <fieldset key={g.titleDe} className="space-y-4">
          <legend className="text-[11px] uppercase tracking-[0.22em] text-subtext">
            {g.titleDe}
          </legend>
          <div className="space-y-4">
            {g.keys.map((k) => {
              const entry = entryByKey.get(k);
              if (!entry) return null;
              return <SiteProfileInput key={k} entry={entry} initial={initial} />;
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function SiteProfileInput({ entry, initial }: { entry: SiteProfileEntry; initial?: unknown }) {
  const name = siteProfileFieldName(entry);
  const defaultValue = readSiteProfileValue(initial, entry.key);
  return (
    <label className="grid grid-cols-12 gap-4 items-baseline rounded-md px-3 py-2 -mx-3 has-[:focus-within]:bg-paper-2/50 transition-colors">
      <span className="col-span-3 text-[10px] uppercase tracking-[0.2em] text-subtext">
        {entry.labelDe}
        {entry.unit && <span className="ml-1 text-ink-2 normal-case tracking-normal">({entry.unit})</span>}
      </span>
      <span className="col-span-9 space-y-1">
        <Input
          name={name}
          type={entry.type === 'number' ? 'number' : 'text'}
          inputMode={entry.type === 'number' ? 'decimal' : undefined}
          step={entry.type === 'number' ? 'any' : undefined}
          defaultValue={defaultValue}
        />
        {entry.hintDe && <span className="block text-[11px] text-subtext">{entry.hintDe}</span>}
      </span>
    </label>
  );
}
