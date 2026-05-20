import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, orgMembers } from '@/lib/db/schema';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
import { compute } from '@/lib/engine';
import { inputsToValues, type InputRaw } from '@/lib/engine/inputs-reader';
import { draftRationale } from '@/lib/llm/client';
import { checkRateLimit } from '@/lib/llm/rate-limit';
import { env } from '@/env';

const schema = z.object({
  calcId: z.string().uuid(),
  locale: z.enum(['de', 'en']),
});

const MOCK_RATIONALE_TEXT =
  'Die Bemessung des Regenüberlaufbeckens erfolgte gemäß DWA-A-201. ' +
  'Auf Basis der ermittelten Einzugsgebietsfläche und des maßgebenden Bemessungsregens wurde das ' +
  'erforderliche Beckenvolumen berechnet. Die gewählte Beckengeometrie gewährleistet eine ausreichende ' +
  'hydraulische Leistungsfähigkeit sowie die Einhaltung der zulässigen Entlastungshäufigkeit. ' +
  'Sämtliche Eingangswerte wurden dem Entwurfsstand entnommen und sind in den Anlagen dokumentiert. ' +
  '\n\n[Dieser Text wurde im Mock-Modus (MOCK_LLM=1) generiert und enthält keine echten KI-Inhalte.]';

export async function POST(request: NextRequest) {
  if (!env.MOCK_LLM && !env.DEEPSEEK_API_KEY && !env.KIMI_API_KEY) {
    return NextResponse.json(
      { error: 'llm_not_configured', message: 'No LLM provider configured.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipLimit = checkRateLimit(`ip:${ip}`, 20, 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: { 'retry-after': String(Math.ceil((ipLimit.retryAfterMs ?? 0) / 1000)) },
      },
    );
  }

  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, body.data.calcId))
    .limit(1);
  if (!calc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id));
  if (!memberships.some((m) => m.orgId === calc.orgId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const orgLimit = checkRateLimit(`org:${calc.orgId}`, 200, 60_000);
  if (!orgLimit.ok) return NextResponse.json({ error: 'org_rate_limited' }, { status: 429 });

  const worksheet = ALL_WORKSHEETS.find((w) => w.id === calc.worksheetId);
  if (!worksheet) return NextResponse.json({ error: 'unknown_worksheet' }, { status: 500 });

  // Calc.inputs may be in mixed-cell shape (Plan 6); extract bare values
  // for the engine and the LLM (which formats them as JSON).
  const values = inputsToValues(
    (calc.inputs ?? {}) as Record<string, InputRaw>,
  );
  const result = compute(worksheet, values);

  if (env.MOCK_LLM) {
    await db
      .update(calculations)
      .set({ rationaleDraft: MOCK_RATIONALE_TEXT, updatedAt: new Date() })
      .where(eq(calculations.id, calc.id));
    return NextResponse.json({ text: MOCK_RATIONALE_TEXT, provider: 'mock' });
  }

  try {
    const { text, provider } = await draftRationale({
      worksheetId: worksheet.id,
      regulation: worksheet.regulation,
      regulationVersion: worksheet.regulationVersion,
      inputs: values,
      computed: result.computed,
      locale: body.data.locale,
    });

    await db
      .update(calculations)
      .set({ rationaleDraft: text, updatedAt: new Date() })
      .where(eq(calculations.id, calc.id));

    return NextResponse.json({ text, provider });
  } catch (e) {
    return NextResponse.json(
      { error: 'llm_failed', message: e instanceof Error ? e.message : 'unknown' },
      { status: 502 },
    );
  }
}
