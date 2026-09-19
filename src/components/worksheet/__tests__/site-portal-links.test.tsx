import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SitePortalLinks } from '../site-portal-links';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

const LAT = 'fld-lat';
const LON = 'fld-lon';

describe('SitePortalLinks', () => {
  it('asks for coordinates while lat/lon are empty', () => {
    useWorksheetStore.getState().init('inst-1', { [LAT]: { type: 'number', value: null }, [LON]: { type: 'number', value: null } }, {}, {});
    render(<SitePortalLinks latFieldId={LAT} lonFieldId={LON} />);
    expect(screen.getByText(/Breite und Länge des Standorts/)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders the three preset portal links from the stored coordinates', () => {
    useWorksheetStore.getState().init('inst-1', { [LAT]: { type: 'number', value: 51.7339 }, [LON]: { type: 'number', value: 7.3189 } }, {}, {});
    render(<SitePortalLinks latFieldId={LAT} lonFieldId={LON} label="Testprojekt" />);
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    expect(links).toHaveLength(3);
    expect(links[0].href).toContain('tim-online.nrw.de/tim-online2/?center=51.733900,7.318900');
    expect(links[0].href).toContain('text=Testprojekt');
    expect(links[1].href).toContain('elwasweb.nrw.de/elwas-web/map-index.xhtml?layer=trinkwasserschutzgebiete_fest');
    expect(links[2].href).toContain('layer=grundwasserstandsmessstellen');
    for (const a of links) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toContain('noopener');
    }
  });
});
