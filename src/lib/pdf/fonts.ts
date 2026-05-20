import 'server-only';

/**
 * Font registration entry point.
 *
 * Currently a no-op — we use the PDF spec built-in fonts Helvetica (sans)
 * and Courier (mono). They render on every PDF reader without external
 * font files and avoid the fontkit/WOFF parsing edge case (RangeError on
 * certain glyphs) we hit while trying to register @fontsource Inter.
 *
 * To re-introduce custom fonts later, register them here with
 * `Font.register(...)`. @fontsource v5 ships WOFF only; if Font.register
 * fails, prefer downloading TTF assets directly into public/fonts/ and
 * registering those.
 */
export function ensureFonts(): void {
  // intentionally empty
}

// Keep @fontsource/inter and @fontsource/jetbrains-mono as deps so the
// regression path is one Font.register call away when we revisit fonts.
