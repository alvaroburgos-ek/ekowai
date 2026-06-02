import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'node:crypto';

const BUCKET = 'project-documents';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Structural validation for path components. Even though all current
 *  callers receive these IDs from Drizzle / Supabase auth (which already
 *  produces UUIDs), the admin client bypasses RLS and the filepath ends up
 *  in the bucket as-is — a caller injecting `../../other-org/...` would
 *  escape the org partition. Refusing non-UUID inputs at this boundary
 *  closes that surface deterministically. */
function assertUuid(label: string, v: string): void {
  if (!UUID_RE.test(v)) {
    throw new Error(`storage_invalid_${label}: ${v.slice(0, 64)}`);
  }
}

export async function uploadProjectDocument(args: {
  orgId: string;
  projectId: string;
  documentId: string;
  fileName: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ filePath: string; sha256: string }> {
  assertUuid('orgId', args.orgId);
  assertUuid('projectId', args.projectId);
  assertUuid('documentId', args.documentId);
  const safe = args.fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  const filePath = `${args.orgId}/${args.projectId}/${args.documentId}-${safe}`;
  const sha256 = crypto.createHash('sha256').update(args.bytes).digest('hex');

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, args.bytes, { contentType: args.mimeType, upsert: false });
  if (error) throw new Error(`storage_upload_failed: ${error.message}`);

  return { filePath, sha256 };
}

export async function getDocumentSignedUrl(filePath: string, expiresInSec = 300) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSec);
  if (error) throw new Error(`signed_url_failed: ${error.message}`);
  return data.signedUrl;
}

export async function deleteProjectDocument(filePath: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw new Error(`storage_delete_failed: ${error.message}`);
}

export async function downloadProjectDocument(filePath: string): Promise<Buffer> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
  if (error) throw new Error(`storage_download_failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}
