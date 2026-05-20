'use client';
import { Button } from '@/components/ui/button';

type Props = {
  status: 'draft' | 'submitted_for_review' | 'engineer_approved' | 'final' | 'deactivated';
};

export function ApprovalBar({ status }: Props) {
  return (
    <section className="border-t border-hairline pt-6 mt-8 flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-1">Status</div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-paper-2 text-ink">
          {status}
        </span>
      </div>
      <div className="text-xs text-subtext italic">
        Approval-State-Machine: Plan 4
      </div>
      <Button variant="ghost" size="sm" disabled>
        Zur Prüfung einreichen
      </Button>
    </section>
  );
}
