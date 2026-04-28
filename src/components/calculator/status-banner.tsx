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

  const tone =
    status === 'approved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : status === 'rejected'
        ? 'border-red-200 bg-red-50 text-red-900'
        : status === 'changes_requested'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-sky-200 bg-sky-50 text-sky-900';

  return (
    <div className={`rounded-lg border p-3 text-sm ${tone}`} role="status">
      <p className="font-medium">{t(`status.${status}`)}</p>
      {lastApprovalComment && <p className="mt-1 text-xs">{lastApprovalComment}</p>}
    </div>
  );
}
