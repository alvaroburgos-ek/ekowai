import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/pdf/build-report';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, orgMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  // Ownership check: user must be a member of the calc's org
  const [row] = await db
    .select({ id: calculations.id, orgId: calculations.orgId })
    .from(calculations)
    .innerJoin(orgMembers, eq(orgMembers.orgId, calculations.orgId))
    .where(and(eq(calculations.id, id), eq(orgMembers.userId, user.id)))
    .limit(1);
  if (!row) {
    return new NextResponse('not found', { status: 404 });
  }

  try {
    const buf = await buildReport(id);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="bemessungsbericht-${id}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return new NextResponse(`build failed: ${msg}`, { status: 500 });
  }
}
