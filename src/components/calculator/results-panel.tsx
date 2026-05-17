'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { WorksheetSection as SectionDef } from '@/lib/engine';
import { useTranslations } from 'next-intl';

type CheckState = 'pass' | 'fail' | 'open';

function ruleSymbol(kind: 'lte' | 'gte' | 'eq'): string {
  return kind === 'gte' ? '≥' : kind === 'lte' ? '≤' : '=';
}

function classify(observed: unknown, rule: { kind: 'lte' | 'gte' | 'eq'; value: number }): CheckState {
  if (observed === undefined || observed === null || observed === '') return 'open';
  const v = typeof observed === 'number' ? observed : Number(observed);
  if (!Number.isFinite(v)) return 'open';
  switch (rule.kind) {
    case 'lte':
      return v <= rule.value ? 'pass' : 'fail';
    case 'gte':
      return v >= rule.value ? 'pass' : 'fail';
    case 'eq':
      return v === rule.value ? 'pass' : 'fail';
  }
}

function formatNum(v: unknown, precision = 2): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return v.toLocaleString('de-DE', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision === 0 ? 0 : 1,
  });
}

export function ResultsPanel({
  section,
  locale,
}: {
  section: SectionDef;
  locale: 'de' | 'en';
}) {
  const worksheet = useCalculatorStore((s) => s.worksheet);
  const inputs = useCalculatorStore((s) => s.inputs);
  const result = useCalculatorStore((s) => s.result);
  const t = useTranslations('result');
  void section;

  if (!worksheet || !result) return null;

  const computedDefs = new Map(worksheet.computed.map((c) => [c.id, c]));
  const inputDefs = new Map(worksheet.inputs.map((i) => [i.id, i]));

  // Computed values
  const computedItems = worksheet.computed.map((c) => ({
    id: c.id,
    label: locale === 'de' ? c.labelDe : c.labelEn,
    citation: c.citation,
    unit: c.unit,
    value: result.computed[c.id],
    precision: c.precision ?? 2,
  }));

  // Threshold rows + sort
  const checkedRows = worksheet.thresholds.map((th) => {
    const observed = inputs[th.ref] ?? result.computed[th.ref];
    const inputDef = inputDefs.get(th.ref);
    const computedDef = computedDefs.get(th.ref);
    const def = inputDef ?? computedDef;
    const fieldLabel = def
      ? locale === 'de'
        ? def.labelDe
        : def.labelEn
      : th.ref;
    const fieldUnit = def?.unit ?? undefined;
    const state = classify(observed, th.rule);
    const num = typeof observed === 'number' ? observed : Number(observed);
    return {
      id: th.id,
      fieldLabel,
      fieldUnit,
      observed: Number.isFinite(num) ? num : null,
      ruleSymbol: ruleSymbol(th.rule.kind),
      ruleValue: th.rule.value,
      citation: th.citation,
      state,
    };
  });
  const order: Record<CheckState, number> = { fail: 0, open: 1, pass: 2 };
  const sortedChecks = [...checkedRows].sort((a, b) => order[a.state] - order[b.state]);

  const passCount = checkedRows.filter((r) => r.state === 'pass').length;
  const failCount = checkedRows.filter((r) => r.state === 'fail').length;
  const openCount = checkedRows.filter((r) => r.state === 'open').length;
  const totalChecks = checkedRows.length;

  const status = result.compliance.status;
  const statusBig =
    status === 'compliant'
      ? t('big.compliant')
      : status === 'warning'
        ? t('big.warning')
        : status === 'blocking_violation'
          ? t('big.violation')
          : t('big.unknown');
  const statusTone =
    status === 'compliant'
      ? 'text-success'
      : status === 'warning'
        ? 'text-warning'
        : status === 'blocking_violation'
          ? 'text-error'
          : 'text-subtext';
  const statusBgTone =
    status === 'compliant'
      ? 'bg-success-soft/30 border-success/40'
      : status === 'warning'
        ? 'bg-warning-soft/30 border-warning/40'
        : status === 'blocking_violation'
          ? 'bg-error-soft/30 border-error/40'
          : 'bg-paper-2/40 border-hairline';

  return (
    <section className="border border-hairline bg-paper relative overflow-hidden">
      {/* Engineering corner ticks */}
      <span aria-hidden className="absolute top-0 left-0 w-3 h-px bg-ink" />
      <span aria-hidden className="absolute top-0 left-0 h-3 w-px bg-ink" />
      <span aria-hidden className="absolute top-0 right-0 w-3 h-px bg-ink" />
      <span aria-hidden className="absolute top-0 right-0 h-3 w-px bg-ink" />
      <span aria-hidden className="absolute bottom-0 left-0 w-3 h-px bg-ink" />
      <span aria-hidden className="absolute bottom-0 left-0 h-3 w-px bg-ink" />
      <span aria-hidden className="absolute bottom-0 right-0 w-3 h-px bg-ink" />
      <span aria-hidden className="absolute bottom-0 right-0 h-3 w-px bg-ink" />

      {/* Top meta strip */}
      <div className="px-6 pt-5 pb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
          {t('header')} · {worksheet.id}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-subtext flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full"
            style={{
              background: 'var(--eko-gradient)',
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
          {t('live')}
        </span>
      </div>

      {/* Status as headline */}
      <div className={`mx-6 my-2 px-5 py-5 border ${statusBgTone}`}>
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
          {t('statusLabel')}
        </div>
        <div className={`text-2xl font-semibold tracking-tight leading-none ${statusTone}`}>
          {statusBig}
        </div>

        {/* Pictogram strip — every check at a glance */}
        {totalChecks > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex flex-wrap gap-1 text-base leading-none">
              {checkedRows.map((r) => (
                <span
                  key={r.id}
                  title={r.fieldLabel}
                  className={
                    r.state === 'pass'
                      ? 'text-success'
                      : r.state === 'fail'
                        ? 'text-error'
                        : 'text-warning/70'
                  }
                >
                  {r.state === 'pass' ? '✓' : r.state === 'fail' ? '✗' : '⌬'}
                </span>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-subtext tabular-nums flex gap-3">
              <span className="text-success">
                {String(passCount).padStart(2, '0')} {t('pass')}
              </span>
              {failCount > 0 && (
                <span className="text-error">
                  {String(failCount).padStart(2, '0')} {t('fail')}
                </span>
              )}
              {openCount > 0 && (
                <span className="text-warning">
                  {String(openCount).padStart(2, '0')} {t('open')}
                </span>
              )}
              <span className="text-subtext">
                / {String(totalChecks).padStart(2, '0')} {t('total')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Computed values — formulas */}
      {computedItems.length > 0 && (
        <div className="border-t border-hairline mt-4">
          <div className="px-6 pt-4 pb-1 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
              {t('computedTitle')}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] tabular-nums text-subtext">
              {computedItems.length}
            </span>
          </div>
          <ul className="divide-y divide-hairline">
            {computedItems.map((c, i) => (
              <li
                key={c.id}
                className="grid grid-cols-12 gap-3 px-6 py-3 items-baseline hover:bg-paper-2/30 transition-colors"
              >
                <span className="col-span-1 text-[11px] tabular-nums text-subtext">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="col-span-6">
                  <div className="text-sm text-ink">{c.label}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
                    {c.citation}
                  </div>
                </div>
                <div className="col-span-5 text-right">
                  <span
                    className="tabular-nums text-xl text-ink leading-none"
                    data-num
                  >
                    {formatNum(c.value, c.precision)}
                  </span>
                  {c.unit && (
                    <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-1">
                      {c.unit}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified parameters — ledger */}
      {sortedChecks.length > 0 && (
        <div className="border-t border-hairline">
          <div className="px-6 pt-4 pb-1 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-subtext">
              {t('verifiedTitle')}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] tabular-nums text-subtext">
              {String(sortedChecks.length).padStart(2, '0')}
            </span>
          </div>
          <ul className="divide-y divide-hairline">
            {sortedChecks.map((r) => {
              const tone =
                r.state === 'fail'
                  ? 'text-error'
                  : r.state === 'open'
                    ? 'text-warning'
                    : 'text-success';
              const bgTone =
                r.state === 'fail'
                  ? 'bg-error-soft/15'
                  : r.state === 'open'
                    ? 'bg-warning-soft/15'
                    : '';
              const mark = r.state === 'fail' ? '✗' : r.state === 'open' ? '⌬' : '✓';
              return (
                <li
                  key={r.id}
                  className={`grid grid-cols-12 gap-3 px-6 py-3 items-baseline ${bgTone}`}
                >
                  <span
                    className={`col-span-1 text-base text-center leading-none ${tone}`}
                  >
                    {mark}
                  </span>
                  <div className="col-span-6">
                    <div className="text-sm text-ink leading-snug">{r.fieldLabel}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
                      {r.citation}
                    </div>
                  </div>
                  <div className="col-span-5 text-right">
                    {r.observed !== null ? (
                      <div>
                        <span className="tabular-nums text-base text-ink">
                          {formatNum(r.observed)}
                        </span>
                        {r.fieldUnit && (
                          <span className="ml-1 text-[10px] text-subtext">
                            {r.fieldUnit}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-subtext uppercase tracking-[0.18em]">
                        {t('noValue')}
                      </div>
                    )}
                    <div
                      className={`text-[10px] tabular-nums mt-0.5 ${
                        r.state === 'fail' ? 'text-error' : 'text-subtext'
                      }`}
                    >
                      {r.ruleSymbol} {formatNum(r.ruleValue)}
                      {r.fieldUnit && ` ${r.fieldUnit}`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Inputs-only fallback (no thresholds + no computed) */}
      {sortedChecks.length === 0 && computedItems.length === 0 && (
        <div className="border-t border-hairline">
          <div className="px-6 pt-4 pb-1 text-[10px] uppercase tracking-[0.25em] text-subtext">
            {t('enteredTitle')}
          </div>
          <ul className="divide-y divide-hairline">
            {worksheet.inputs.map((f, i) => {
              const v = inputs[f.id];
              const empty = v === null || v === undefined || v === '';
              const isNum = typeof v === 'number';
              return (
                <li
                  key={f.id}
                  className="grid grid-cols-12 gap-3 px-6 py-3 items-baseline"
                >
                  <span className="col-span-1 text-[11px] tabular-nums text-subtext">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="col-span-7">
                    <div className="text-sm text-ink leading-snug">
                      {locale === 'de' ? f.labelDe : f.labelEn}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
                      {f.citation}
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    {empty ? (
                      <span className="text-[10px] text-subtext uppercase tracking-[0.18em]">
                        {t('noValue')}
                      </span>
                    ) : (
                      <span className="tabular-nums text-sm text-ink">
                        {isNum ? formatNum(v as number) : String(v)}
                        {f.unit && (
                          <span className="ml-1 text-[10px] text-subtext">
                            {f.unit}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Engine errors */}
      {result.errors.length > 0 && (
        <div className="border-t-2 border-error bg-error-soft/30 px-6 py-3">
          {result.errors.map((e) => (
            <p key={e} className="text-[11px] text-error">
              ⚠ {e}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
