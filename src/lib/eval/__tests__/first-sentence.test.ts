/** U-7 (UX pass 820, 2026-10-08): the form shows a hint's first sentence; the rest folds behind „mehr". */
import { describe, it, expect } from 'vitest';
import { firstSentence, HINT_SHORT_MAX } from '../hint-text';

const pad = (s: string) => s + ' ' + 'Weitere Erläuterung folgt hier mit genug Text, damit die Grenze überschritten wird. '.repeat(3);

describe('firstSentence', () => {
  it('a text up to 180 characters is shown whole', () => {
    const t = 'Kurzer Satz. Noch ein kurzer Satz. Und ein dritter.';
    expect(t.length).toBeLessThanOrEqual(HINT_SHORT_MAX);
    expect(firstSentence(t)).toEqual({ head: t, rest: null });
  });

  it('splits after the first sentence of a long text; head + rest = the full text', () => {
    const t = pad('Die Bedarfsplanung des Projekts ist abgeschlossen und dokumentiert.');
    const r = firstSentence(t);
    expect(r.head).toBe('Die Bedarfsplanung des Projekts ist abgeschlossen und dokumentiert.');
    expect(r.rest).toMatch(/^Weitere Erläuterung/);
    expect(`${r.head} ${r.rest}`).toBe(t.trim());
  });

  it('never splits before 40 characters', () => {
    const t = pad('Kurz. Danach kommt der eigentliche erste lange Satz des Hinweises.');
    expect(firstSentence(t).head).toBe('Kurz. Danach kommt der eigentliche erste lange Satz des Hinweises.');
  });

  it('abbreviations z. B., u. a., S. 44, § 5., Nr., bzw., ca., Abs. are not sentence ends', () => {
    const s =
      'Gilt z. B. für Mulden, u. a. nach S. 44 der Norm, gemäß § 5. Abs. 2 bzw. Nr. 3 mit ca. 10 m Abstand zum Gebäude.';
    const r = firstSentence(pad(s));
    expect(r.head).toBe(s);
  });

  it('a closing German quote stays in the head', () => {
    const s = 'Die Norm verlangt ausdrücklich eine „vollständige Bedarfsplanung.“';
    const r = firstSentence(pad(s));
    expect(r.head).toBe(s);
    expect(r.rest).toMatch(/^Weitere/);
  });

  it('a newline after the period is a boundary', () => {
    const s = 'Erster Satz mit genügend Zeichen für die Mindestlänge.';
    const r = firstSentence(`${s}\n${'Zweiter Absatz mit viel weiterem Text. '.repeat(5)}`);
    expect(r.head).toBe(s);
  });

  it('English e.g. / i.e. are not sentence ends', () => {
    const s = 'Applies to swales, e.g. shallow ones, i.e. those below 30 cm depth in the design.';
    expect(firstSentence(pad(s)).head).toBe(s);
  });

  it('a long text without a boundary is shown whole', () => {
    const t = 'x'.repeat(250);
    expect(firstSentence(t)).toEqual({ head: t, rest: null });
  });
});
