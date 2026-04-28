import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.2';
import { CalculatorShell } from '@/components/calculator/calculator-shell';

export default async function CalcPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en'; id: string; calcId: string }>;
}) {
  const { locale, id, calcId } = await params;
  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, calcId))
    .limit(1);
  if (!calc || calc.projectId !== id) notFound();

  const worksheet = ALL_WORKSHEETS.find((w) => w.id === calc.worksheetId);
  if (!worksheet) notFound();

  return (
    <CalculatorShell
      locale={locale}
      calcId={calc.id}
      projectId={id}
      name={calc.name}
      worksheet={worksheet}
      initialInputs={(calc.inputs ?? {}) as Record<string, number | string | boolean | null>}
      lastSavedAt={calc.updatedAt.toISOString()}
    />
  );
}
