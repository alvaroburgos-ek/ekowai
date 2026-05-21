import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { projects, standards, worksheetTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function StandardWorksheetsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; standardCode: string }>;
}) {
  const { locale, id, standardCode } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const [std] = await db.select().from(standards).where(eq(standards.code, standardCode)).limit(1);
  if (!std) notFound();

  const ws = await db
    .select({
      code: worksheetTemplates.code,
      titleDe: worksheetTemplates.titleDe,
      phase: worksheetTemplates.phase,
      orderIndex: worksheetTemplates.orderIndex,
    })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, std.id))
    .orderBy(worksheetTemplates.orderIndex);

  if (ws.length === 0) notFound();

  // Redirect to the first worksheet
  redirect(`/${locale}/projects/${id}/standards/${standardCode}/worksheets/${ws[0].code}`);
}
