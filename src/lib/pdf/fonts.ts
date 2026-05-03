import 'server-only';
import { Font } from '@react-pdf/renderer';
import path from 'node:path';

let registered = false;

/**
 * Register Inter + JetBrainsMono with @react-pdf/renderer.
 *
 * Note: @fontsource v5 ships only WOFF/WOFF2 (no TTF). fontkit 2.x
 * (vendored by @react-pdf/font) parses WOFF natively, so we point
 * directly at the .woff files in node_modules. We avoid WOFF2 because
 * it needs brotli decompression which is not always available in
 * serverless environments.
 */
export function ensureFonts(): void {
  if (registered) return;

  const fontSourceRoot = path.join(
    process.cwd(),
    'node_modules',
    '@fontsource',
  );

  Font.register({
    family: 'Inter',
    fonts: [
      {
        src: path.join(
          fontSourceRoot,
          'inter',
          'files',
          'inter-latin-400-normal.woff',
        ),
        fontWeight: 'normal',
      },
      {
        src: path.join(
          fontSourceRoot,
          'inter',
          'files',
          'inter-latin-500-normal.woff',
        ),
        fontWeight: 'medium',
      },
      {
        src: path.join(
          fontSourceRoot,
          'inter',
          'files',
          'inter-latin-600-normal.woff',
        ),
        fontWeight: 'semibold',
      },
    ],
  });

  Font.register({
    family: 'JetBrainsMono',
    src: path.join(
      fontSourceRoot,
      'jetbrains-mono',
      'files',
      'jetbrains-mono-latin-400-normal.woff',
    ),
  });

  // Disable hyphenation — engineering reports don't hyphenate
  // compound German words well.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
