import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { RiskRegisterEditor } from '../risk-register-editor';

// Reproduces server-side rendering (no DOM) — catches crashes that jsdom
// render() would miss. The worksheet page SSRs WorksheetForm (a client
// component) for the initial HTML, so RiskRegisterEditor must SSR cleanly.
describe('RiskRegisterEditor — SSR', () => {
  it('renders to string without throwing (empty store)', () => {
    expect(() => renderToString(<RiskRegisterEditor fieldId="fixture" />)).not.toThrow();
  });
  it('renders readOnly to string without throwing', () => {
    expect(() => renderToString(<RiskRegisterEditor fieldId="fixture" readOnly />)).not.toThrow();
  });
});
