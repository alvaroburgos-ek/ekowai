'use client';

import { useState, useTransition } from 'react';
import {
  verifyField,
  unverifyField,
  verifyEquation,
  unverifyEquation,
} from '@/lib/actions/verification';

type Target = 'field' | 'equation';

type Props = {
  target: Target;
  id: string;
  /** Current verification_status of the row. The button only renders when
   * the viewer is a platform engineer (parent gates this) — but we still
   * pick the action based on the current state. */
  status: string;
  /** Display name for "bestätigt von X am Y". Pre-resolved server-side. */
  verifiedByLabel?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;
};

export function VerifyButton({
  target,
  id,
  status,
  verifiedByLabel,
  verifiedAt,
  verificationNote,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isVerified =
    status === 'engineer_verified'
    || status === 'verified_against_standard'
    || status === 'corrected';

  function runVerify() {
    setError(null);
    startTransition(async () => {
      try {
        // A verbatim quote upgrades the verification to
        // verified_against_standard (SR-1); without one it is the plain
        // engineer confirmation.
        const opts = {
          note: note || undefined,
          quote: quote || undefined,
          status: quote ? 'verified_against_standard' : 'engineer_verified',
        };
        if (target === 'field') {
          await verifyField(id, opts);
        } else {
          await verifyEquation(id, opts);
        }
        setNoteOpen(false);
        setNote('');
        setQuote('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler');
      }
    });
  }

  function runUnverify() {
    setError(null);
    startTransition(async () => {
      try {
        if (target === 'field') {
          await unverifyField(id);
        } else {
          await unverifyEquation(id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler');
      }
    });
  }

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-[0.18em] text-subtext normal-case tracking-normal">
        <span className="text-success">
          {status === 'verified_against_standard' ? '✓ norm-verifiziert' : status === 'corrected' ? '✓ korrigiert' : '✓ bestätigt'}
          {verifiedByLabel ? ` von ${verifiedByLabel}` : ''}
          {verifiedAt ? ` am ${formatDate(verifiedAt)}` : ''}
        </span>
        {verificationNote && (
          <span
            className="text-subtext italic"
            title={verificationNote}
          >
            „{truncate(verificationNote, 40)}&rdquo;
          </span>
        )}
        <button
          type="button"
          onClick={runUnverify}
          disabled={pending}
          className="text-subtext underline-offset-2 hover:text-accent-2 hover:underline disabled:opacity-50"
        >
          Rückgängig
        </button>
      </span>
    );
  }

  if (noteOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap normal-case tracking-normal">
        <input
          type="text"
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optionale Notiz (z.B. §5.4 Tab. B.1)"
          maxLength={500}
          className="text-xs px-1.5 py-0.5 border border-hairline rounded bg-paper text-ink w-full sm:w-64 focus:outline-none focus:border-accent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') runVerify();
            if (e.key === 'Escape') {
              setNoteOpen(false);
              setNote('');
            }
          }}
        />
        <input
          type="text"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Verbatim-Zitat aus der Norm (SR-1) → norm-verifiziert"
          maxLength={2000}
          className="text-xs px-1.5 py-0.5 border border-hairline rounded bg-paper text-ink w-full sm:w-80 focus:outline-none focus:border-accent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') runVerify();
            if (e.key === 'Escape') {
              setNoteOpen(false);
              setNote('');
              setQuote('');
            }
          }}
        />
        <button
          type="button"
          onClick={runVerify}
          disabled={pending}
          className="text-xs px-2 py-0.5 bg-accent text-paper rounded hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? '…' : 'Bestätigen'}
        </button>
        <button
          type="button"
          onClick={() => {
            setNoteOpen(false);
            setNote('');
          }}
          disabled={pending}
          className="text-xs text-subtext hover:text-ink"
        >
          Abbrechen
        </button>
        {error && <span className="text-xs text-accent-2">{error}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setNoteOpen(true)}
      disabled={pending}
      className="text-[10px] uppercase tracking-[0.18em] text-accent normal-case tracking-normal underline-offset-2 hover:underline disabled:opacity-50"
      title="Diesen Eintrag gegen die Quellnorm bestätigen"
    >
      ✓ Bestätigen
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
