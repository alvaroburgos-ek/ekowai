'use client';

import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { buildPortalLinks } from '@/lib/site-profile/portal-links';

type Props = { latFieldId: string; lonFieldId: string; label?: string };

/** Links into TIM-online and ELWAS-WEB preset with the worksheet's site
 *  coordinates (A138-01 `site_lat` / `site_lon`). Read-only helper: it opens
 *  the portal at the right place; zone, parcel and wells are still read and
 *  entered by the engineer. */
export function SitePortalLinks({ latFieldId, lonFieldId, label = 'Standort' }: Props) {
  const lat = useWorksheetStore((s) => s.values[latFieldId]);
  const lon = useWorksheetStore((s) => s.values[lonFieldId]);
  const latN = lat?.type === 'number' ? lat.value : null;
  const lonN = lon?.type === 'number' ? lon.value : null;
  const links = buildPortalLinks(latN, lonN, { label });

  return (
    <div className="space-y-2" data-testid="site-portal-links">
      <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">
        Portale mit dem Standort voreingestellt
      </div>
      {links == null ? (
        <p className="text-xs text-subtext italic">
          Breite und Länge des Standorts (WGS84, innerhalb NRW) eintragen, dann öffnen die Links TIM-online und ELWAS-WEB an dieser Stelle.
        </p>
      ) : (
        <ul className="space-y-1">
          {links.map((l) => (
            <li key={l.key} className="text-sm">
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:text-ink"
              >
                {l.label} ↗
              </a>
              <span className="ml-2 text-xs text-subtext">{l.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
