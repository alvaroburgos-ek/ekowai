'use client';

import { useMemo, useState } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { normalizeChecklist, type ChecklistConfig, type ChecklistCarrier } from '@/lib/eval/selection-fields';

type Props = { fieldId: string; config: ChecklistConfig; readOnly?: boolean };

export function ChecklistEditor({ fieldId, config, readOnly = false }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const [custom, setCustom] = useState('');
  const carrier = useMemo<ChecklistCarrier>(
    () => normalizeChecklist(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );
  const selected = new Set(carrier.selected);

  function write(next: string[]) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: { selected: [...new Set(next)] } });
  }
  function toggle(option: string) {
    if (selected.has(option)) write(carrier.selected.filter((x) => x !== option));
    else write([...carrier.selected, option]);
  }
  function addCustom() {
    const v = custom.trim();
    if (!v || selected.has(v)) { setCustom(''); return; }
    write([...carrier.selected, v]);
    setCustom('');
  }

  const customEntries = carrier.selected.filter((x) => !config.options.includes(x));
  /** Plan 3 final wave B (defect 2, `m820_2-E-1`): render the printed label, store the value.
   *  Same rule as the register editor's enum column (`option_labels?.[o] ?? o`). */
  const labelOf = (value: string): string => config.optionLabels?.[value] ?? value;

  return (
    <div className="space-y-2" data-testid="checklist-editor">
      <div>
        <div className="text-sm font-medium text-ink">{config.title}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">{config.subtitle}</div>
      </div>

      {config.groups?.length ? (
        <div className="space-y-2.5">
          {config.groups.map((g) => (
            <fieldset key={g.label} className="space-y-1">
              <legend className="text-[10px] uppercase tracking-[0.18em] text-subtext mb-1">{g.label}</legend>
              {g.options.map((opt) => (
                <label key={opt} className="flex items-start gap-2 text-sm text-ink cursor-pointer">
                  <input type="checkbox" checked={selected.has(opt)} disabled={readOnly} onChange={() => toggle(opt)} className="mt-1 shrink-0" />
                  <span>{labelOf(opt)}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {config.options.map((opt) => (
            <label key={opt} className="flex items-start gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={selected.has(opt)} disabled={readOnly} onChange={() => toggle(opt)} className="mt-1 shrink-0" />
              <span>{labelOf(opt)}</span>
            </label>
          ))}
        </div>
      )}

      {customEntries.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {customEntries.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded border border-hairline px-2 py-0.5 text-xs text-ink">
              {c}
              <button type="button" disabled={readOnly} onClick={() => toggle(c)} aria-label={`${c} entfernen`} className="text-subtext hover:text-error disabled:opacity-40">×</button>
            </span>
          ))}
        </div>
      ) : null}

      {config.allowCustom ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            disabled={readOnly}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="Weitere Rechtsgrundlage / Eintrag …"
            aria-label="Eigener Eintrag"
            className="flex-1 rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button type="button" onClick={addCustom} disabled={readOnly} className="text-xs px-3 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-50">
            + hinzufügen
          </button>
        </div>
      ) : null}

      {config.note ? <p className="text-[11px] text-subtext">{config.note}</p> : null}
      <div className="text-[11px] text-subtext border-t border-hairline-strong pt-2">
        <span className="font-mono">{carrier.selected.length}</span> ausgewählt
      </div>
    </div>
  );
}
