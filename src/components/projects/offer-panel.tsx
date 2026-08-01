'use client';

import { useState, useTransition } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  FileDown,
  Lock,
  Pencil,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createOffer,
  updateOffer,
  addOfferPosition,
  deleteOfferPosition,
  setOrgRates,
} from '@/lib/actions/offers';
import type { ListOffersResult, OfferView, OfferRoleView } from '@/lib/actions/offers';
import { addRateRole, deactivateRateRole } from '@/lib/actions/rate-roles';
import { getOfferNachkalkulation } from '@/lib/actions/nachkalkulation';
import type { OfferNachkalkulationView } from '@/lib/actions/nachkalkulation';
import type { MarginVerdict } from '@/lib/offers/margin';
import type { HoursCompareRow } from '@/lib/nachkalkulation/compare';

/**
 * Angebote (intern) — Slice E1 panel on the project overview.
 * Margin badge + calibration are INTERNAL; the client-facing artifact is the
 * PDF route only, which carries positions + Festpreis and nothing else.
 */

function fmtNum(v: string | number, digits = 2): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits });
}

function fmtEur(v: string | number): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function parseDecimal(s: string): number {
  return Number(s.replace(',', '.'));
}

const BADGE_CLASSES: Record<MarginVerdict, string> = {
  red: 'bg-error-soft text-error',
  amber: 'bg-warning-soft text-warning',
  green: 'bg-success-soft text-success',
};

const BADGE_LABEL: Record<MarginVerdict, string> = {
  red: 'unter Zielmarge',
  amber: 'unkalibriert',
  green: 'ok',
};

function MarginBadge({ offer }: { offer: OfferView }) {
  const m = offer.margin;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${BADGE_CLASSES[m.verdict]}`}
      title={m.reasons.join(' · ') || 'Marge im Zielbereich'}
    >
      <span
        className="size-2 rounded-full bg-current shrink-0"
        aria-hidden
      />
      {`Marge ${fmtEur(m.margin)} · ${fmtNum(m.marginPct, 1)} % · ${BADGE_LABEL[m.verdict]}`}
    </span>
  );
}

/**
 * Role list under "Stundensätze": active paid roles (Ingenieur, Freelancer,
 * Praktikant, …) with their €/h; add + deactivate are owner/admin only.
 */
function RoleRates({
  orgId,
  roles,
  canSetRates,
}: {
  orgId: string;
  roles: OfferRoleView[];
  canSetRates: boolean;
}) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rateNum = parseDecimal(rate);
  const canAdd =
    name.trim() !== '' && rate.trim() !== '' && Number.isFinite(rateNum) && rateNum > 0;

  function handleAdd() {
    if (!canAdd) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await addRateRole({
          orgId,
          name: name.trim(),
          hourlyRateEur: rateNum,
        });
        if (!res.ok) {
          setError(
            res.error === 'forbidden'
              ? 'Nur Org-Owner/Admin dürfen Rollen anlegen.'
              : res.error === 'duplicate_name'
                ? 'Eine Rolle mit diesem Namen existiert bereits.'
                : 'Ungültige Eingabe.',
          );
          return;
        }
        setName('');
        setRate('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleDeactivate(roleId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deactivateRateRole({ roleId });
        if (!res.ok) {
          setError(
            res.error === 'forbidden'
              ? 'Nur Org-Owner/Admin dürfen Rollen deaktivieren.'
              : 'Rolle konnte nicht deaktiviert werden.',
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-subtext">Rollen</span>
      {roles.length === 0 ? (
        <p className="text-[11px] text-subtext italic">
          Keine Rollen — alle Positionen rechnen mit dem Standard-Stundensatz.
        </p>
      ) : (
        <ul className="space-y-1">
          {roles.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 text-sm tabular-nums"
            >
              <span className="text-ink break-words">{r.name}</span>
              <span className="text-subtext">{`${fmtNum(r.hourlyRateEur)} €/h`}</span>
              {canSetRates && (
                <button
                  type="button"
                  onClick={() => handleDeactivate(r.id)}
                  disabled={isPending}
                  className="rounded-lg p-0.5 text-subtext hover:bg-paper-2 hover:text-error transition-colors disabled:opacity-50"
                  aria-label={`Rolle ${r.name} deaktivieren`}
                  title="Rolle deaktivieren"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canSetRates && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block sm:w-44">
            <span className="text-xs font-medium text-subtext">Rolle</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Freelancer"
              className="mt-1"
              aria-label="Rollenname"
            />
          </label>
          <label className="block sm:w-32">
            <span className="text-xs font-medium text-subtext">€/h</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="z. B. 60"
              className="mt-1 tabular-nums"
              aria-label="Stundensatz der Rolle"
            />
          </label>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleAdd}
            disabled={isPending || !canAdd}
            className="shrink-0"
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
            Rolle
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

/**
 * Stundensätze (Org): default rate + Zielmarge (owner/admin editable) plus
 * the paid-role list — positions/entries without a role use the default.
 */
function RateSettings({
  orgId,
  internalHourlyRate,
  targetMarginPct,
  canSetRates,
  roles,
}: {
  orgId: string;
  internalHourlyRate: number | null;
  targetMarginPct: number | null;
  canSetRates: boolean;
  roles: OfferRoleView[];
}) {
  const unset = internalHourlyRate === null || targetMarginPct === null;
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(internalHourlyRate?.toString() ?? '');
  const [target, setTarget] = useState(targetMarginPct?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showForm = canSetRates && (unset || editing);

  function handleSave() {
    setError(null);
    const rateNum = rate.trim() === '' ? null : parseDecimal(rate);
    const targetNum = target.trim() === '' ? null : parseDecimal(target);
    startTransition(async () => {
      try {
        const res = await setOrgRates({
          orgId,
          internalHourlyRate: rateNum,
          targetMarginPct: targetNum,
        });
        if (!res.ok) {
          setError(res.error === 'forbidden'
            ? 'Nur Org-Owner/Admin dürfen die Sätze ändern.'
            : 'Ungültige Eingabe.');
          return;
        }
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="rounded-xl border border-hairline bg-paper-2/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-subtext">
          Stundensätze
        </span>
        {!showForm && (
          <div className="flex items-center gap-3 text-sm text-ink tabular-nums">
            <span>
              Standard:{' '}
              {internalHourlyRate !== null ? `${fmtNum(internalHourlyRate)} €/h` : '—'}
            </span>
            <span>
              Zielmarge:{' '}
              {targetMarginPct !== null ? `${fmtNum(targetMarginPct, 1)} %` : '—'}
            </span>
            {canSetRates && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg p-1 text-subtext hover:bg-paper-2 hover:text-accent-2 transition-colors"
                aria-label="Kalkulationsbasis bearbeiten"
                title="Kalkulationsbasis bearbeiten"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
      {unset && (
        <p className="text-xs text-warning">
          Stundensatz nicht kalibriert — Positionen ohne Rolle bleiben gelb,
          bis Standard-Stundensatz und Zielmarge gesetzt sind.
        </p>
      )}
      {showForm && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block sm:w-44">
            <span className="text-xs font-medium text-subtext">
              Standard-Stundensatz (€/h)
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="z. B. 85"
              className="mt-1 tabular-nums"
              aria-label="Stundensatz intern"
            />
          </label>
          <label className="block sm:w-40">
            <span className="text-xs font-medium text-subtext">Zielmarge (%)</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="z. B. 30"
              className="mt-1 tabular-nums"
              aria-label="Zielmarge"
            />
          </label>
          <Button
            size="sm"
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Speichern
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-error">{error}</p>}

      <RoleRates orgId={orgId} roles={roles} canSetRates={canSetRates} />
    </div>
  );
}

/** Δ%-based text color: red above +10 %, green at/below 0, neutral between. */
function deltaClass(deltaPct: number | null): string {
  if (deltaPct === null) return 'text-subtext';
  if (deltaPct > 10) return 'text-error';
  if (deltaPct <= 0) return 'text-success';
  return 'text-ink';
}

function fmtDeltaPct(deltaPct: number | null): string {
  if (deltaPct === null) return '—';
  return `${deltaPct >= 0 ? '+' : ''}${fmtNum(deltaPct, 1)} %`;
}

function HoursRow({ row, isTotals }: { row: HoursCompareRow; isTotals?: boolean }) {
  return (
    <tr className={isTotals ? 'font-medium text-ink border-t border-hairline' : ''}>
      <td className="py-1 pr-3 text-ink break-words">{row.position}</td>
      <td className="py-1 pr-3 text-right tabular-nums">{fmtNum(row.estimated)}</td>
      <td className="py-1 pr-3 text-right tabular-nums">{fmtNum(row.actual)}</td>
      <td className={`py-1 pr-3 text-right tabular-nums ${deltaClass(row.deltaPct)}`}>
        {`${row.deltaHours >= 0 ? '+' : ''}${fmtNum(row.deltaHours)}`}
      </td>
      <td className={`py-1 text-right tabular-nums ${deltaClass(row.deltaPct)}`}>
        {fmtDeltaPct(row.deltaPct)}
      </td>
    </tr>
  );
}

/**
 * Nachkalkulation (Slice E3, YOUR side): Soll- vs. Ist-Stunden per position,
 * loaded lazily on expand. Kalibrierungshinweise are SUGGESTIONS only —
 * template hours change only when the owner edits them.
 */
function OfferNachkalkulation({
  projectId,
  offerId,
}: {
  projectId: string;
  offerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<OfferNachkalkulationView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setError(null);
    getOfferNachkalkulation(projectId)
      .then((res) => {
        setView(res.offers.find((o) => o.offerId === offerId) ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  return (
    <div className="rounded-xl border border-hairline bg-paper-2/40 p-3 space-y-2">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-subtext hover:text-accent-2 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        )}
        Nachkalkulation (Soll/Ist-Stunden)
      </button>

      {open && loading && (
        <p className="text-xs text-subtext inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Lade Ist-Stunden …
        </p>
      )}
      {open && error && <p className="text-xs text-error">{error}</p>}

      {open && !loading && !error && view && (
        <>
          {view.hours.rows.length === 0 ? (
            <p className="text-xs text-subtext italic">
              Keine Positionen und keine Ist-Stunden — nichts zu vergleichen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-subtext text-left">
                    <th className="py-1 pr-3 font-medium">Position</th>
                    <th className="py-1 pr-3 font-medium text-right">Soll (h)</th>
                    <th className="py-1 pr-3 font-medium text-right">Ist (h)</th>
                    <th className="py-1 pr-3 font-medium text-right">Δ h</th>
                    <th className="py-1 font-medium text-right">Δ %</th>
                  </tr>
                </thead>
                <tbody className="text-subtext">
                  {view.hours.rows.map((r) => (
                    <HoursRow key={r.position} row={r} />
                  ))}
                  <HoursRow row={view.hours.totals} isTotals />
                </tbody>
              </table>
            </div>
          )}

          {view.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-subtext">Kalibrierungshinweise</p>
              <ul className="text-xs text-subtext space-y-0.5">
                {view.suggestions.map((s, i) => (
                  <li key={i}>· {s}</li>
                ))}
              </ul>
              <p className="text-[11px] text-subtext italic">
                Nur Hinweise — Vorlagen-Stunden werden nie automatisch geändert.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  projectId,
  locale,
  roles,
}: {
  offer: OfferView;
  projectId: string;
  locale: string;
  roles: OfferRoleView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Position add-row
  const [posName, setPosName] = useState('');
  const [posHours, setPosHours] = useState('');
  const [posExtern, setPosExtern] = useState('');
  /** '' = Standard (org rate); otherwise a rate_roles id. */
  const [posRoleId, setPosRoleId] = useState('');

  // Offer meta edits
  const [editingMeta, setEditingMeta] = useState(false);
  const [festpreis, setFestpreis] = useState(offer.festpreisEur);
  const [validUntil, setValidUntil] = useState(offer.validUntil ?? '');
  const [bearbeitungszeit, setBearbeitungszeit] = useState(offer.bearbeitungszeit ?? '');

  const hoursNum = parseDecimal(posHours);
  const externNum = posExtern.trim() === '' ? 0 : parseDecimal(posExtern);
  const canAddPos =
    posName.trim() !== ''
    && posHours.trim() !== ''
    && Number.isFinite(hoursNum)
    && hoursNum >= 0
    && Number.isFinite(externNum)
    && externNum >= 0;

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleAddPosition() {
    if (!canAddPos) return;
    run(async () => {
      await addOfferPosition({
        offerId: offer.id,
        position: posName.trim(),
        estimatedHours: hoursNum,
        externalCostEur: externNum,
        roleId: posRoleId !== '' ? posRoleId : undefined,
      });
      setPosName('');
      setPosHours('');
      setPosExtern('');
      setPosRoleId('');
    });
  }

  function handleSaveMeta() {
    const fp = parseDecimal(festpreis);
    if (!Number.isFinite(fp) || fp < 0) {
      setError('Festpreis muss eine Zahl ≥ 0 sein.');
      return;
    }
    run(async () => {
      await updateOffer({
        offerId: offer.id,
        festpreisEur: fp,
        validUntil: validUntil.trim() === '' ? null : validUntil,
        bearbeitungszeit: bearbeitungszeit.trim() === '' ? null : bearbeitungszeit.trim(),
      });
      setEditingMeta(false);
    });
  }

  const m = offer.margin;

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-ink break-words">{offer.title}</span>
          <span className="text-xs text-subtext">({offer.status})</span>
        </div>
        <MarginBadge offer={offer} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-subtext tabular-nums">
        <span className="text-ink font-medium">{`Festpreis: ${fmtEur(offer.festpreisEur)}`}</span>
        <span>{`Intern: ${fmtEur(m.internalCost)}`}</span>
        <span>{`Extern: ${fmtEur(m.externalTotal)}`}</span>
        <span>{`Geplant: ${fmtNum(m.totalHours)} h`}</span>
        {m.effectiveHourlyRate !== null && (
          <span>{`Effektiv: ${fmtNum(m.effectiveHourlyRate)} €/h`}</span>
        )}
        {offer.validUntil && <span>{`gültig bis ${offer.validUntil}`}</span>}
        <button
          type="button"
          onClick={() => setEditingMeta((v) => !v)}
          className="rounded-lg p-1 text-subtext hover:bg-paper-2 hover:text-accent-2 transition-colors"
          aria-label="Angebot bearbeiten"
          title="Festpreis / Gültigkeit / Bearbeitungszeit bearbeiten"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <a
          href={`/api/projects/${projectId}/offers/${offer.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-subtext hover:text-accent-2 transition-colors"
          hrefLang={locale}
        >
          <FileDown className="size-3.5" aria-hidden />
          Angebots-PDF
        </a>
      </div>

      {m.reasons.length > 0 && (
        <ul className="text-xs text-subtext space-y-0.5">
          {m.reasons.map((r, i) => (
            <li key={i}>· {r}</li>
          ))}
        </ul>
      )}

      {editingMeta && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end rounded-xl border border-hairline bg-paper-2/40 p-3">
          <label className="block sm:w-36">
            <span className="text-xs font-medium text-subtext">Festpreis (€)</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              value={festpreis}
              onChange={(e) => setFestpreis(e.target.value)}
              className="mt-1 tabular-nums"
              aria-label="Festpreis"
            />
          </label>
          <label className="block sm:w-40">
            <span className="text-xs font-medium text-subtext">Gültig bis</span>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1"
              aria-label="Gültig bis"
            />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-medium text-subtext">
              Bearbeitungszeit ab vollständigen Unterlagen
            </span>
            <Input
              value={bearbeitungszeit}
              onChange={(e) => setBearbeitungszeit(e.target.value)}
              placeholder="z. B. 10 Werktage"
              className="mt-1"
              aria-label="Bearbeitungszeit"
            />
          </label>
          <Button
            size="sm"
            type="button"
            onClick={handleSaveMeta}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Speichern
          </Button>
        </div>
      )}

      {/* Positions */}
      {offer.positions.length > 0 && (
        <ul className="divide-y divide-hairline">
          {offer.positions.map((p) => (
            <li
              key={p.id}
              className="py-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-sm"
            >
              <div className="flex-1 min-w-0 text-ink break-words">
                {p.position}
                {p.note ? (
                  <span className="text-xs text-subtext"> · {p.note}</span>
                ) : null}
              </div>
              <div className="sm:w-24 sm:shrink-0 tabular-nums text-ink">
                {fmtNum(p.estimatedHours)} h
              </div>
              <div className="sm:w-28 sm:shrink-0 text-xs text-subtext break-words">
                {p.roleName ?? 'Standard'}
              </div>
              <div className="sm:w-28 sm:shrink-0 tabular-nums text-subtext">
                {`Extern ${fmtEur(p.externalCostEur)}`}
              </div>
              <button
                type="button"
                onClick={() => run(() => deleteOfferPosition(p.id))}
                disabled={isPending}
                className="self-start sm:self-center shrink-0 rounded-lg p-1.5 text-subtext hover:bg-paper-2 hover:text-error transition-colors disabled:opacity-50"
                aria-label="Position löschen"
                title="Position löschen"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Position add-row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Position</span>
          <Input
            value={posName}
            onChange={(e) => setPosName(e.target.value)}
            placeholder="z. B. Versickerungsnachweis DWA-A 138"
            className="mt-1"
            aria-label="Position"
          />
        </label>
        <label className="block sm:w-28">
          <span className="text-xs font-medium text-subtext">Stunden</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={posHours}
            onChange={(e) => setPosHours(e.target.value)}
            placeholder="0"
            className="mt-1 tabular-nums"
            aria-label="Stunden"
          />
        </label>
        <label className="block sm:w-40">
          <span className="text-xs font-medium text-subtext">Rolle</span>
          <select
            value={posRoleId}
            onChange={(e) => setPosRoleId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Rolle"
          >
            <option value="">Standard</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.name} (${fmtNum(r.hourlyRateEur)} €/h)`}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:w-36">
          <span className="text-xs font-medium text-subtext">Externe Kosten (€)</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="10"
            value={posExtern}
            onChange={(e) => setPosExtern(e.target.value)}
            placeholder="0"
            className="mt-1 tabular-nums"
            aria-label="Externe Kosten"
          />
        </label>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={handleAddPosition}
          disabled={isPending || !canAddPos}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
          Position
        </Button>
      </div>

      {/* Nachkalkulation (Slice E3) — additive, loads on expand */}
      <OfferNachkalkulation projectId={projectId} offerId={offer.id} />

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export function OfferPanel({
  projectId,
  locale,
  data,
}: {
  projectId: string;
  locale: string;
  data: ListOffersResult;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [festpreis, setFestpreis] = useState('');
  const [error, setError] = useState<string | null>(null);

  const festpreisNum = parseDecimal(festpreis);
  const canCreate =
    title.trim() !== ''
    && festpreis.trim() !== ''
    && Number.isFinite(festpreisNum)
    && festpreisNum >= 0;

  function handleCreate() {
    if (!canCreate) return;
    setError(null);
    startTransition(async () => {
      try {
        await createOffer({
          projectId,
          title: title.trim(),
          festpreisEur: festpreisNum,
        });
        setTitle('');
        setFestpreis('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5 space-y-4">
      {/* Internal-view notice — load-bearing: margin data never leaves this panel. */}
      <p className="inline-flex items-center gap-1.5 rounded-lg bg-paper-2/60 px-2.5 py-1.5 text-xs font-medium text-subtext">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        Interne Ansicht — erscheint in keinem Kundendokument.
      </p>

      <RateSettings
        orgId={data.orgId}
        internalHourlyRate={data.internalHourlyRate}
        targetMarginPct={data.targetMarginPct}
        canSetRates={data.canSetRates}
        roles={data.roles}
      />

      {/* Nachkalkulation hook */}
      <div className="flex items-baseline gap-2">
        <span className="tabular-nums text-2xl font-semibold text-ink">
          {fmtNum(data.totalLoggedHours)}
        </span>
        <span className="text-sm text-subtext">
          Ist-Stunden bisher (Aufwandserfassung)
        </span>
      </div>

      {/* Create form */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Titel</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Versickerungsnachweis Neubau Halle 2"
            className="mt-1"
            aria-label="Titel"
          />
        </label>
        <label className="block sm:w-40">
          <span className="text-xs font-medium text-subtext">Festpreis (€)</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            value={festpreis}
            onChange={(e) => setFestpreis(e.target.value)}
            placeholder="0"
            className="mt-1 tabular-nums"
            aria-label="Festpreis"
          />
        </label>
        <Button
          size="sm"
          type="button"
          onClick={handleCreate}
          disabled={isPending || !canCreate}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
          Angebot anlegen
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      {/* Offer list */}
      {data.offers.length === 0 ? (
        <p className="text-[11px] text-subtext py-2 italic">
          Noch keine Angebote angelegt.
        </p>
      ) : (
        <div className="space-y-3">
          {data.offers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              projectId={projectId}
              locale={locale}
              roles={data.roles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
