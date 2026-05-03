'use client';

import { useTransition, useState } from 'react';
import { updateLetterhead } from '@/lib/actions/org-settings';
import { Button } from '@/components/ui/button';

type Org = {
  id: string;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vatId: string | null;
};

const FIELDS: { key: Exclude<keyof Org, 'id'>; label: string; type?: string }[] = [
  { key: 'logoUrl', label: 'Logo URL', type: 'url' },
  { key: 'addressLine1', label: 'Straße' },
  { key: 'addressLine2', label: 'Adresszusatz' },
  { key: 'postalCode', label: 'PLZ' },
  { key: 'city', label: 'Stadt' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-Mail', type: 'email' },
  { key: 'website', label: 'Website', type: 'url' },
  { key: 'vatId', label: 'USt-IdNr.' },
];

export function LetterheadForm({ org }: { org: Org }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      orgId: org.id,
      logoUrl: String(fd.get('logoUrl') ?? ''),
      addressLine1: String(fd.get('addressLine1') ?? ''),
      addressLine2: String(fd.get('addressLine2') ?? ''),
      postalCode: String(fd.get('postalCode') ?? ''),
      city: String(fd.get('city') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      email: String(fd.get('email') ?? ''),
      website: String(fd.get('website') ?? ''),
      vatId: String(fd.get('vatId') ?? ''),
    };
    start(async () => {
      const r = await updateLetterhead(input);
      if (r.ok) setSaved(true);
      else setError(r.error || 'unknown');
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 max-w-xl">
      <h2 className="text-2xl font-semibold text-ink">Briefkopf</h2>
      <p className="font-mono text-[11px] text-subtext">
        Wird auf dem Bemessungsbericht-Deckblatt angezeigt.
      </p>
      {FIELDS.map(({ key, label, type }) => (
        <label key={key} className="grid gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
            {label}
          </span>
          <input
            name={key}
            type={type ?? 'text'}
            defaultValue={org[key] ?? ''}
            className="border border-hairline px-2 py-1 bg-transparent"
          />
        </label>
      ))}
      <div className="flex items-center gap-3 mt-2">
        <Button type="submit" disabled={pending}>
          {pending ? '…' : 'Speichern'}
        </Button>
        {saved && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-success">
            Gespeichert
          </span>
        )}
        {error && (
          <span className="font-mono text-[11px] text-error">{error}</span>
        )}
      </div>
    </form>
  );
}
