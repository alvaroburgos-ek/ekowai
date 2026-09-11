import { describe, it, expect } from 'vitest';
import {
  PHOTO_MAX_BYTES,
  PHOTO_ACCEPT,
  MONITORING_PHOTO_TITLE_PREFIX,
  monitoringPhotoTitle,
  isMonitoringPhotoTitle,
  validatePhotoFile,
  photoUploadErrorMessage,
} from '@/lib/monitoring/photo';

describe('PHOTO constants', () => {
  it('caps photos at 10 MB', () => {
    expect(PHOTO_MAX_BYTES).toBe(10 * 1024 * 1024);
  });

  it('accept attr targets images (camera-capable on mobile)', () => {
    expect(PHOTO_ACCEPT).toBe('image/*');
  });
});

describe('monitoringPhotoTitle', () => {
  it('builds "Monitoring-Foto dd.mm.yyyy" from an ISO date', () => {
    expect(monitoringPhotoTitle('2026-08-01')).toBe('Monitoring-Foto 01.08.2026');
  });

  it('passes a non-ISO string through unformatted', () => {
    expect(monitoringPhotoTitle('heute')).toBe('Monitoring-Foto heute');
  });

  it('always starts with the detection prefix', () => {
    expect(
      monitoringPhotoTitle('2026-08-01').startsWith(MONITORING_PHOTO_TITLE_PREFIX),
    ).toBe(true);
  });
});

describe('isMonitoringPhotoTitle', () => {
  it('detects the prefix', () => {
    expect(isMonitoringPhotoTitle('Monitoring-Foto 01.08.2026')).toBe(true);
  });

  it('rejects other document titles', () => {
    expect(isMonitoringPhotoTitle('Bodenkundliches Gutachten')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isMonitoringPhotoTitle(null)).toBe(false);
    expect(isMonitoringPhotoTitle(undefined)).toBe(false);
  });

  it('rejects the prefix appearing mid-title', () => {
    expect(isMonitoringPhotoTitle('Altes Monitoring-Foto Archiv')).toBe(false);
  });
});

describe('validatePhotoFile', () => {
  it('accepts an image at exactly the 10 MB limit', () => {
    expect(validatePhotoFile({ size: PHOTO_MAX_BYTES, type: 'image/jpeg' })).toBeNull();
  });

  it('accepts common photo types', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
      expect(validatePhotoFile({ size: 1024, type })).toBeNull();
    }
  });

  it('accepts an EMPTY mime type (mobile HEIC quirk)', () => {
    expect(validatePhotoFile({ size: 1024, type: '' })).toBeNull();
  });

  it('rejects a file over 10 MB with a German message', () => {
    const msg = validatePhotoFile({ size: PHOTO_MAX_BYTES + 1, type: 'image/jpeg' });
    expect(msg).toBe('Foto ist zu groß — maximal 10 MB.');
  });

  it('rejects non-image types with a German message', () => {
    const msg = validatePhotoFile({ size: 1024, type: 'application/pdf' });
    expect(msg).toBe('Nur Bilddateien sind erlaubt (JPEG, PNG, WebP, HEIC).');
  });

  it('type check wins over size check for oversized non-images', () => {
    const msg = validatePhotoFile({
      size: PHOTO_MAX_BYTES + 1,
      type: 'application/zip',
    });
    expect(msg).toBe('Nur Bilddateien sind erlaubt (JPEG, PNG, WebP, HEIC).');
  });
});

describe('photoUploadErrorMessage', () => {
  it('maps the upload action error codes to German messages', () => {
    expect(photoUploadErrorMessage('no_file')).toBe('Keine Datei ausgewählt.');
    expect(photoUploadErrorMessage('too_large')).toBe(
      'Foto ist zu groß — maximal 10 MB.',
    );
    expect(photoUploadErrorMessage('invalid_input')).toBe(
      'Ungültige Eingabe beim Foto-Upload.',
    );
    expect(photoUploadErrorMessage('project_not_found')).toBe(
      'Projekt nicht gefunden oder kein Zugriff.',
    );
    expect(photoUploadErrorMessage('storage_failed')).toBe(
      'Foto-Upload fehlgeschlagen — bitte erneut versuchen.',
    );
  });

  it('falls back to a generic German message for unknown codes', () => {
    expect(photoUploadErrorMessage('weird_new_code')).toBe(
      'Foto-Upload fehlgeschlagen.',
    );
  });
});
