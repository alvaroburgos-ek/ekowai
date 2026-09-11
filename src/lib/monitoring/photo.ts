/**
 * Photo-attachment pure helpers for the Monitoring-Journal.
 *
 * The actual upload reuses the EXISTING document path (server action
 * `uploadDocument` in `src/lib/actions/documents.ts` → storage helper
 * `src/lib/storage/documents.ts`, bucket `project-documents`) — this module
 * only holds the client-side guards and naming rules, kept DB/DOM-free so
 * they are unit-testable.
 */

/** Client-side hard cap for a monitoring photo (the upload action itself
 *  allows 25 MB for general documents — photos are capped tighter). */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/**
 * `accept` attribute for the photo input. `image/*` covers jpeg/png/webp/heic
 * and keeps mobile browsers offering the camera (paired with
 * `capture="environment"` on the input itself).
 */
export const PHOTO_ACCEPT = 'image/*';

/** Title prefix that marks a project document as a monitoring photo —
 *  the entry list detects photos by this prefix (the journal's document
 *  row shape carries no MIME type). */
export const MONITORING_PHOTO_TITLE_PREFIX = 'Monitoring-Foto';

/**
 * Document title for a monitoring photo taken for the given journal-entry
 * date (ISO yyyy-mm-dd) — e.g. `Monitoring-Foto 01.08.2026`. Formats the
 * date German-style without locale APIs so the result is deterministic.
 */
export function monitoringPhotoTitle(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const shown = m ? `${m[3]}.${m[2]}.${m[1]}` : isoDate;
  return `${MONITORING_PHOTO_TITLE_PREFIX} ${shown}`;
}

/** True when a linked document's title marks it as a monitoring photo. */
export function isMonitoringPhotoTitle(title: string | null | undefined): boolean {
  return title != null && title.startsWith(MONITORING_PHOTO_TITLE_PREFIX);
}

/**
 * Validate a picked photo file client-side. Returns a German error message,
 * or null when the file is acceptable.
 *
 * Type rule: anything `image/*` passes; an EMPTY type also passes because
 * several mobile browsers deliver HEIC captures with no MIME type — the
 * `accept` attribute already filtered the picker, and the server keeps its
 * existing validation untouched.
 */
export function validatePhotoFile(file: { size: number; type: string }): string | null {
  if (file.type !== '' && !file.type.startsWith('image/')) {
    return 'Nur Bilddateien sind erlaubt (JPEG, PNG, WebP, HEIC).';
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return 'Foto ist zu groß — maximal 10 MB.';
  }
  return null;
}

/** German messages for the upload action's error codes (documents.ts). */
const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  no_file: 'Keine Datei ausgewählt.',
  too_large: 'Foto ist zu groß — maximal 10 MB.',
  invalid_input: 'Ungültige Eingabe beim Foto-Upload.',
  project_not_found: 'Projekt nicht gefunden oder kein Zugriff.',
  storage_failed: 'Foto-Upload fehlgeschlagen — bitte erneut versuchen.',
};

/** Map an upload-action error code to a German inline message. */
export function photoUploadErrorMessage(code: string): string {
  return UPLOAD_ERROR_MESSAGES[code] ?? 'Foto-Upload fehlgeschlagen.';
}
