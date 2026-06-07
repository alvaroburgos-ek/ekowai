'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Check,
  Mail,
  Archive,
  ArchiveRestore,
  UserRoundCheck,
  UserRoundX,
  ChevronDown,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  claimLead,
  unclaimLead,
  markLeadContacted,
  archiveLead,
  reopenLead,
  convertLeadToProject,
} from '@/lib/actions/leads';

export type LeadCardData = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  topic: string;
  message: string | null;
  standardCode: string | null;
  sourcePath: string | null;
  source: string;
  status: string;
  claimedByUserId: string | null;
  claimedByName: string | null;
  claimedByEmail: string | null;
  createdAtIso: string;
  convertedToProjectId: string | null;
  convertedProjectName: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-accent-soft text-accent-2',
  contacted: 'bg-warning-soft text-warning',
  converted: 'bg-success-soft text-success',
  archived: 'bg-paper-3 text-subtext',
};

export function LeadRow({
  lead,
  locale,
  currentUserId,
}: {
  lead: LeadCardData;
  locale: 'de' | 'en';
  currentUserId: string;
}) {
  const t = useTranslations('leads');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owned = !!lead.claimedByUserId && lead.claimedByUserId === currentUserId;
  const isActive = lead.status === 'new' || lead.status === 'contacted';

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(t(`errors.${res.error ?? 'generic'}` as Parameters<typeof t>[0]));
      else router.refresh();
    });
  };

  const received = new Date(lead.createdAtIso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <tr className={cn('align-top transition-colors', expanded ? 'bg-paper-2/40' : 'hover:bg-paper-2/30')}>
        {/* Contact */}
        <td className="py-3.5 px-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="group flex items-start gap-2 text-left"
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn('size-4 mt-0.5 shrink-0 text-subtext transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
            <span className="flex flex-col">
              <span className="font-medium text-ink">{lead.name}</span>
              <span className="text-xs text-subtext">{lead.email}</span>
              {lead.company && <span className="text-xs text-ink-2">{lead.company}</span>}
            </span>
          </button>
        </td>
        {/* Topic */}
        <td className="py-3.5 px-2 text-ink-2">{lead.topic}</td>
        {/* Standard */}
        <td className="py-3.5 px-2">
          {lead.standardCode ? (
            <span className="font-mono text-xs text-subtext">{lead.standardCode}</span>
          ) : (
            <span className="text-subtext">—</span>
          )}
        </td>
        {/* Received */}
        <td className="py-3.5 px-2 text-xs text-subtext whitespace-nowrap" suppressHydrationWarning>
          {received}
        </td>
        {/* Status */}
        <td className="py-3.5 px-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
              STATUS_STYLE[lead.status] ?? STATUS_STYLE.archived,
            )}
          >
            {t(`status.${lead.status}` as Parameters<typeof t>[0])}
          </span>
        </td>
        {/* Owner */}
        <td className="py-3.5 px-2 text-xs">
          {lead.claimedByUserId ? (
            <span className="text-ink-2">{owned ? t('you') : lead.claimedByName || lead.claimedByEmail}</span>
          ) : (
            <span className="text-subtext">{t('unclaimed')}</span>
          )}
        </td>
        {/* Actions */}
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1.5">
            {lead.status === 'converted' && lead.convertedToProjectId && (
              <Link href={`/${locale}/projects/${lead.convertedToProjectId}`}>
                <Button size="sm" variant="outline">
                  <FolderOpen aria-hidden />
                  {t('action.openProject')}
                </Button>
              </Link>
            )}

            {isActive && (
              <Button size="sm" onClick={() => { setError(null); setConvertOpen(true); }} disabled={pending}>
                {t('action.convert')}
              </Button>
            )}

            {lead.status === 'new' && (
              <IconButton title={t('action.contacted')} disabled={pending} onClick={() => run(() => markLeadContacted(lead.id))}>
                <Check className="size-4" aria-hidden />
              </IconButton>
            )}

            {isActive && (
              owned ? (
                <IconButton title={t('action.unclaim')} disabled={pending} onClick={() => run(() => unclaimLead(lead.id))}>
                  <UserRoundX className="size-4" aria-hidden />
                </IconButton>
              ) : (
                <IconButton title={t('action.claim')} disabled={pending} onClick={() => run(() => claimLead(lead.id))}>
                  <UserRoundCheck className="size-4" aria-hidden />
                </IconButton>
              )
            )}

            <IconButton title={t('action.email')} asChild>
              <a href={`mailto:${lead.email}`}>
                <Mail className="size-4" aria-hidden />
              </a>
            </IconButton>

            {lead.status !== 'archived' && lead.status !== 'converted' && (
              <IconButton title={t('action.archive')} disabled={pending} onClick={() => run(() => archiveLead(lead.id))}>
                <Archive className="size-4" aria-hidden />
              </IconButton>
            )}

            {lead.status === 'archived' && (
              <IconButton title={t('action.reopen')} disabled={pending} onClick={() => run(() => reopenLead(lead.id))}>
                <ArchiveRestore className="size-4" aria-hidden />
              </IconButton>
            )}

            {pending && <Loader2 className="size-4 animate-spin text-subtext" aria-hidden />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-paper-2/40">
          <td colSpan={7} className="px-4 pb-4 pt-0">
            <div className="rounded-xl border border-hairline bg-paper p-4 space-y-3 text-sm">
              {error && <Alert variant="error">{error}</Alert>}
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <DetailRow label={t('col.contact')}>
                  <a href={`mailto:${lead.email}`} className="text-accent-2 hover:underline">{lead.email}</a>
                  {lead.phone && <span className="text-ink-2"> · {lead.phone}</span>}
                </DetailRow>
                {lead.convertedProjectName && (
                  <DetailRow label={t('status.converted')}>
                    <span className="text-ink-2">{lead.convertedProjectName}</span>
                  </DetailRow>
                )}
                {lead.sourcePath && (
                  <DetailRow label={t('via')}>
                    <span className="font-mono text-xs text-subtext">{lead.sourcePath}</span>
                  </DetailRow>
                )}
              </div>
              <DetailRow label={t('messageLabel')}>
                {lead.message ? (
                  <span className="text-ink-2 whitespace-pre-wrap">{lead.message}</span>
                ) : (
                  <span className="text-subtext italic">{t('noMessage')}</span>
                )}
              </DetailRow>
            </div>
          </td>
        </tr>
      )}

      {convertOpen && (
        <ConvertDialog lead={lead} locale={locale} onClose={() => setConvertOpen(false)} />
      )}
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">{label}</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  disabled,
  asChild,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  asChild?: boolean;
  children: ReactNode;
}) {
  const className =
    'inline-flex items-center justify-center rounded-full p-2 text-subtext hover:bg-paper-2 hover:text-ink transition-colors disabled:opacity-40 disabled:pointer-events-none';
  if (asChild) {
    return (
      <span title={title} className={className}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

type ConvertSuccess = { projectId: string; standardAttached: 'attached' | 'not_found' | 'none' };

function ConvertDialog({
  lead,
  locale,
  onClose,
}: {
  lead: LeadCardData;
  locale: 'de' | 'en';
  onClose: () => void;
}) {
  const t = useTranslations('leads');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ConvertSuccess | null>(null);
  const [name, setName] = useState(lead.company || lead.name);
  const [clientName, setClientName] = useState(lead.company ?? '');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await convertLeadToProject(lead.id, {
        name: name.trim(),
        clientName: clientName.trim() || undefined,
        location: location.trim() || undefined,
        locale,
      });
      if (!res.ok) {
        setError(t(`errors.${res.error}` as Parameters<typeof t>[0]));
        return;
      }
      setSuccess({ projectId: res.projectId, standardAttached: res.standardAttached });
      router.refresh();
    });
  };

  const successMessage = (() => {
    if (!success) return '';
    if (lead.standardCode && success.standardAttached === 'attached')
      return t('toast.convertedWithStandard', { code: lead.standardCode });
    if (lead.standardCode && success.standardAttached === 'not_found')
      return t('toast.convertedStandardMissing', { code: lead.standardCode });
    return t('toast.converted');
  })();

  return (
    <tr>
      <td>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-dialog-title"
            className="w-full max-w-md rounded-lg border border-hairline bg-paper shadow-soft-hover p-6 space-y-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <>
                <Alert variant={success.standardAttached === 'not_found' ? 'info' : 'success'}>
                  {successMessage}
                </Alert>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={onClose}>
                    {t('convert.cancel')}
                  </Button>
                  <Button onClick={() => router.push(`/${locale}/projects/${success.projectId}`)}>
                    <FolderOpen aria-hidden />
                    {t('action.openProject')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <h2 id="convert-dialog-title" className="text-lg font-semibold text-ink tracking-tight">
                    {t('convert.title')}
                  </h2>
                  <p className="text-sm text-subtext">{t('convert.lede')}</p>
                </div>

                {error && <Alert variant="error">{error}</Alert>}

                <div className="space-y-4">
                  <DialogField label={t('convert.projectName')} required>
                    <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
                  </DialogField>
                  <DialogField label={t('convert.client')}>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </DialogField>
                  <DialogField label={t('convert.location')}>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                  </DialogField>
                  {lead.standardCode && (
                    <p className="text-xs text-subtext">
                      {t('convert.standardHint', { code: lead.standardCode })}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={onClose} disabled={pending}>
                    {t('convert.cancel')}
                  </Button>
                  <Button onClick={submit} disabled={pending || name.trim().length < 2}>
                    {pending && <Loader2 className="animate-spin" aria-hidden />}
                    {pending ? t('convert.submitting') : t('convert.submit')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function DialogField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-subtext">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
