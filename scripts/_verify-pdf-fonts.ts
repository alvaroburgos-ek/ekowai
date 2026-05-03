// One-off: render a 1-page PDF to confirm fonts load.
//
// We do NOT import `@/lib/pdf/fonts` here because that module declares
// `import 'server-only'`, which throws when imported outside of Next.js
// bundler context (e.g. via tsx). Instead we inline the same Font.register
// calls so this script verifies the *font file paths* end-to-end through
// fontkit. If fonts.ts changes, mirror the change here.
import path from 'node:path';
import { createElement as h } from 'react';
import {
  Document,
  Font,
  Page,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { styles } from '@/lib/pdf/styles';

function registerFonts(): void {
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

  Font.registerHyphenationCallback((word) => [word]);
}

async function main() {
  registerFonts();
  const doc = h(
    Document,
    null,
    h(
      Page,
      { size: 'A4', style: styles.page },
      h(View, null, h(Text, { style: styles.h1 }, 'EKOWAI Wizard — font check')),
      h(View, { style: styles.row }, h(Text, { style: styles.num }, '1.234,56')),
    ),
  );
  const buf = await renderToBuffer(doc);
  if (buf.slice(0, 4).toString() !== '%PDF') {
    throw new Error('PDF magic bytes missing — render failed');
  }
  console.log(`OK: rendered ${buf.length} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
