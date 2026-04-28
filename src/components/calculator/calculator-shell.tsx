'use client';

import { useEffect } from 'react';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import type { Worksheet, InputValues } from '@/lib/engine';
import { WorksheetSection } from './worksheet-section';
import { ResultsPanel } from './results-panel';
import { ComplianceBadge } from './compliance-badge';
import { OfflineBadge } from './offline-badge';
import { SaveStatus } from './save-status';
import { RationaleBox } from './rationale-box';
import { DecisionBanner } from './decision-banner';
import { StatusBanner } from './status-banner';
import { SubmitButton } from './submit-button';
import { ApprovalActions } from './approval-actions';
import { CrossReferencePanel, type CrossReference } from './cross-reference-panel';

interface RecordedDecision {
  decisionPointId: string;
  choice: string;
  rationale: string | null;
}

export function CalculatorShell(props: {
  locale: 'de' | 'en';
  calcId: string;
  projectId: string;
  name: string;
  worksheet: Worksheet;
  initialInputs: InputValues;
  lastSavedAt: string;
  initialDraft: string | null;
  initialFinal: string | null;
  initialDecisions: RecordedDecision[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  lastApprovalComment: string | null;
  canReview: boolean;
  crossRefs: CrossReference[];
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
    <article className="space-y-10">
      <header className="border-b border-hairline pb-8 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext flex items-baseline gap-2 flex-wrap">
            <span>
              {props.worksheet.regulation} · {props.worksheet.regulationVersion} ·{' '}
              Arbeitsblatt {props.worksheet.id}
              <span className="mx-2 text-hairline-strong">/</span>
              {props.worksheet.sourceCitation}
            </span>
            {props.worksheet.status === 'preview' && (
              <span className="px-1.5 py-0.5 border border-warning text-warning">
                Vorschau
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ComplianceBadge locale={props.locale} />
            <OfflineBadge />
            <SaveStatus locale={props.locale} />
            {(props.status === 'draft' || props.status === 'changes_requested') && (
              <SubmitButton calcId={props.calcId} resubmit={props.status === 'changes_requested'} />
            )}
          </div>
        </div>
        {props.worksheet.status === 'preview' && (
          <div
            role="note"
            className="border-l-2 border-warning bg-warning-soft/40 px-4 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-0.5 text-warning">
              Vorschau-Arbeitsblatt
            </p>
            <p className="text-sm text-ink-2 leading-relaxed">
              Die Schwellwerte und Berechnungsformeln dieses Arbeitsblatts sind noch
              nicht kanonisch gegen DWA-A-201 v3.2 validiert. Ergebnisse sind beratend;
              finale Bemessung nach Validierung der Worksheet-JSON aus dem EKOWAI-Agent (IB-7).
            </p>
          </div>
        )}
        <div>
          <h1 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight leading-[1.05] mb-2">
            {props.name}
          </h1>
          <p className="text-lg text-ink-2 italic">
            {props.locale === 'de' ? props.worksheet.titleDe : props.worksheet.titleEn}
          </p>
        </div>
      </header>

      <StatusBanner status={props.status} lastApprovalComment={props.lastApprovalComment} />

      <DecisionBanner locale={props.locale} initialDecisions={props.initialDecisions} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {inputSection && (
          <div className="lg:col-span-5">
            <WorksheetSection locale={props.locale} section={inputSection} editable />
          </div>
        )}
        {resultSection && (
          <div className="lg:col-span-7">
            <ResultsPanel locale={props.locale} section={resultSection} />
          </div>
        )}
      </div>

      <RationaleBox
        initialDraft={props.initialDraft}
        initialFinal={props.initialFinal}
        locale={props.locale}
      />

      <CrossReferencePanel crossRefs={props.crossRefs} />

      {props.canReview && props.status === 'submitted' && (
        <ApprovalActions calcId={props.calcId} />
      )}
    </article>
  );
}
