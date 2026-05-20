import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'node:crypto';

const BUCKET = 'project-documents';

export async function uploadProjectDocument(args: {
  orgId: string;
  projectId: string;
  documentId: string;
  fileName: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ filePath: string; sha256: string }> {
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
