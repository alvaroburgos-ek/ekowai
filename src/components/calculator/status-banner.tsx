'use client';

import { useTranslations } from 'next-intl';

export function StatusBanner({
  status,
  lastApprovalComment,
}: {
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  lastApprovalComment: string | null;
}) {
  const t = useTranslations('approval');
  if (status === 'draft') return null;

  const toneCls =
    status === 'approved'
      ? 'border-success bg-success-soft/40 text-success'
      : status === 'rejected'
        ? 'border-error bg-error-soft/40 text-error'
        : status === 'changes_requested'
          ? 'border-warning bg-warning-soft/40 text-warning'
          : 'border-accent bg-accent-soft/30 text-accent-2';

  return (
    <div className={`rounded-md px-5 py-4 ${toneCls}`} role="status">
      <p className="font-display text-lg font-semibold">{t(`status.${status}`)}</p>
      {lastApprovalComment && (
        <p className="mt-1.5 text-sm opacity-80">{lastApprovalComment}</p>
      )}
    </div>
  );
}
