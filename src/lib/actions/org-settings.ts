'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { orgs, orgMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return user;
}

const Letterhead = z.object({
  orgId: z.string().uuid(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  vatId: z.string().max(50).optional(),
});

export async function updateLetterhead(input: z.infer<typeof Letterhead>) {
  const user = await requireUser();
  const parsed = Letterhead.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'invalid_input' };

  // Ownership check: user must be an owner or admin of this org.
  const [member] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.userId, user.id),
        eq(orgMembers.orgId, parsed.data.orgId),
      ),
    )
    .limit(1);
  if (!member) return { ok: false as const, error: 'forbidden' };
  if (member.role !== 'owner' && member.role !== 'admin') {
    return { ok: false as const, error: 'forbidden' };
  }

  const { orgId, ...rawData } = parsed.data;
  // Empty strings → null in DB so optional fields stay nullable
  const data = Object.fromEntries(
    Object.entries(rawData).map(([k, v]) => [k, v === '' || v === undefined ? null : v]),
  );

  await db.update(orgs).set(data).where(eq(orgs.id, orgId));
  revalidatePath('/org');
  return { ok: true as const };
}
