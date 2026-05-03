import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'node:crypto';

const BUCKET = 'report-archives';

export async function uploadReportArchive(args: {
  orgId: string;
  calcId: string;
  approvalId: string;
  bytes: Buffer;
}): Promise<{ filePath: string; sha256: string }> {
  const filePath = `${args.orgId}/${args.calcId}/${args.approvalId}.pdf`;
  const sha256 = crypto.createHash('sha256').update(args.bytes).digest('hex');
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, args.bytes, {
      contentType: 'application/pdf',
      upsert: false,
    });
  if (error) throw new Error(`archive_upload_failed: ${error.message}`);
  return { filePath, sha256 };
}

export async function getArchiveSignedUrl(
  filePath: string,
  expiresInSec = 300,
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSec);
  if (error) throw new Error(`signed_url_failed: ${error.message}`);
  return data.signedUrl;
}
