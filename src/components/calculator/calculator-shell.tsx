'use client';

import { useEffect } from 'react';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { Worksheet, InputValues } from '@/lib/engine';
import { WorksheetSection } from './worksheet-section';
import { ResultsPanel } from './results-panel';
import { ComplianceBadge } from './compliance-badge';
import { OfflineBadge } from './offline-badge';
import { SaveStatus } from './save-status';

export function CalculatorShell(props: {
  locale: 'de' | 'en';
  calcId: string;
  projectId: string;
  name: string;
  worksheet: Worksheet;
  initialInputs: InputValues;
  lastSavedAt: string;
}) {
  const init = useCalculatorStore((s) => s.init);

  useEffect(() => {
    init({
      calcId: props.calcId,
      worksheet: props.worksheet,
      inputs: props.initialInputs,
      lastSavedAt: props.lastSavedAt,
    });
  }, [init, props.calcId, props.worksheet, props.initialInputs, props.lastSavedAt]);

  const inputSection = props.worksheet.sections.find((s) => s.id === 'inputs');
  const resultSection = props.worksheet.sections.find((s) => s.id !== 'inputs');

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{props.name}</h1>
          <p className="text-sm text-slate-600">
            {props.locale === 'de' ? props.worksheet.titleDe : props.worksheet.titleEn} ·{' '}
            {props.worksheet.regulation} {props.worksheet.regulationVersion} ·{' '}
            {props.worksheet.sourceCitation}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ComplianceBadge locale={props.locale} />
          <OfflineBadge />
          <SaveStatus locale={props.locale} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {inputSection && (
          <WorksheetSection locale={props.locale} section={inputSection} editable />
        )}
        {resultSection && <ResultsPanel locale={props.locale} section={resultSection} />}
      </div>
    </div>
  );
}
