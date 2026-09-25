import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesignWindowPanel } from '../design-window-panel';
import { KOSTRA_123107_T10, KOSTRA_123107_T5 } from '@/lib/eval/__tests__/fixtures/kostra-123107';

const CASE = { A_C: 162.2, k_i: 6.6e-7, f_Z: 1.2, f_A: 1, Q_Dr: 0 };

describe('DesignWindowPanel (Mulde, case numbers)', () => {
  it('shows the current row inside the window with the derived values and the three limits', () => {
    render(<DesignWindowPanel facility="mulde" rows={KOSTRA_123107_T10} designReturnPeriod={10} compareRows={{ T: 5, rows: KOSTRA_123107_T5 }} scalars={CASE} current={250} />);
    const cur = screen.getByTestId('design-window-current');
    expect(cur.textContent).toMatch(/A_S_m = 250,0 m²: im Fenster/);
    expect(cur.textContent).toMatch(/V_M 17,0 m³/);
    expect(cur.textContent).toMatch(/D 540 min/);
    expect(cur.textContent).toMatch(/h 6,8 cm/);
    expect(cur.textContent).toMatch(/q_S_AC 10,2/);
    expect(screen.getAllByText('erfüllt')).toHaveLength(2); // h_max (Regelwert) + q_min; t_E is 'Info: ok'
    expect(screen.getByText('Info: ok')).toBeInTheDocument();
    expect(screen.getByText('Regelwert')).toBeInTheDocument();
    expect(screen.getByTestId('design-window-chart')).toBeInTheDocument();
    expect(screen.getByText(/max 17\.0 m³ bei D = 540 min/)).toBeInTheDocument();
    expect(screen.getByText(/Vergleich T = 5 a/).textContent).toMatch(/V_M 13,6 m³/);
  });

  it('marks a too-small swale as outside and names the violated limits', () => {
    render(<DesignWindowPanel facility="mulde" rows={KOSTRA_123107_T10} designReturnPeriod={10} scalars={CASE} current={40} />);
    expect(screen.getByTestId('design-window-current').textContent).toMatch(/außerhalb/);
    expect(screen.getAllByText('verletzt')).toHaveLength(2); // h_max + q_min; t_E is 'Info: über'
    expect(screen.getByText('Info: über')).toBeInTheDocument();
  });

  it('explains what is missing instead of rendering nothing', () => {
    render(<DesignWindowPanel facility="mulde" rows={KOSTRA_123107_T10} designReturnPeriod={10} scalars={{ k_i: 6.6e-7 }} current={250} />);
    expect(screen.getByTestId('design-window').textContent).toMatch(/Fehlende Eingaben: A_C/);
  });
});

describe('interpretation text', () => {
  it('reads the case in the guideline terms with margins and the quoted sentence', () => {
    render(<DesignWindowPanel facility="mulde" rows={KOSTRA_123107_T10} designReturnPeriod={10} scalars={CASE} current={250} />);
    const t = screen.getByTestId('design-window-interpretation').textContent!;
    expect(t).toMatch(/Einstauhöhe Mulde i\. d\. R\. ≤ 30 cm ist erfüllt: 6,8 cm, Reserve 23,2 cm/);
    expect(t).toMatch(/für Mulden i\. d\. R\. ≤ 30/);
    expect(t).toMatch(/Entleerungszeit ≤ 84 h \(Information, n = 1\/a\) ist erfüllt: 28,6 h/);
    expect(t).toMatch(/nicht erforderlich, da die Anwendungsgrenze/);
    expect(t).toMatch(/q_S,AC ≥ 2 l\/\(s·ha\) ist erfüllt: 10,2/);
    expect(t).toMatch(/Gesamt: A_S_m = 250 m² liegt im Bemessungsfenster/);
  });

  it('names the violated limit, the shortfall and the lever when outside', () => {
    render(<DesignWindowPanel facility="mulde" rows={KOSTRA_123107_T10} designReturnPeriod={10} scalars={CASE} current={40} />);
    const t = screen.getByTestId('design-window-interpretation').textContent!;
    expect(t).toMatch(/Einstauhöhe Mulde i\. d\. R\. ≤ 30 cm ist verletzt: 31,4 cm gegenüber höchstens 30 cm \(1,4 cm zu viel\)/);
    expect(t).toMatch(/Hebel: Sohlenfläche vergrößern/);
    expect(t).toMatch(/Entleerungszeit ≤ 84 h \(Information, n = 1\/a\) überschritten \(nur Information, begrenzt das Fenster nicht\)/);
    expect(t).toMatch(/liegt außerhalb des Fensters \(h_max, q_min\)/);
  });
});
