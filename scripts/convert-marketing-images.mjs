import { createRequire } from 'node:module';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('C:/EKOWAI-Wizard/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');

const DIR = 'C:/EKOWAI-Wizard/public/images/marketing';

// Theme detection from the original Midjourney prompt fragment in the filename.
// Order matters — first match wins.
const themes = [
  { match: /contemporary_industrial_park|small_sleek_stain/i, slug: 'industrial-park' },
  { match: /cutting-edge_urban_building_with_a_rooftop/i,    slug: 'urban-rooftop' },
  { match: /floating_wetla/i,                                 slug: 'wetlands-floating' },
  { match: /modern_urban_waterfront/i,                        slug: 'urban-waterfront' },
  { match: /modern_minimalist_home_featuring_a_natural/i,     slug: 'minimalist-home-pool' },
  { match: /pond_in_a_park/i,                                 slug: 'park-pond' },
];

function themeFor(filename) {
  for (const t of themes) if (t.match.test(filename)) return t.slug;
  return null;
}

const files = (await readdir(DIR))
  .filter((f) => f.toLowerCase().endsWith('.png'))
  .sort();

// Group by theme to assign sequential numbers
const grouped = new Map();
for (const f of files) {
  const slug = themeFor(f);
  if (!slug) {
    console.warn(`SKIP (no theme match): ${f}`);
    continue;
  }
  if (!grouped.has(slug)) grouped.set(slug, []);
  grouped.get(slug).push(f);
}

let totalIn = 0;
let totalOut = 0;
const renames = [];

for (const [slug, list] of grouped) {
  let i = 1;
  for (const original of list) {
    const newName = `${slug}-${String(i).padStart(2, '0')}.webp`;
    const inPath = path.join(DIR, original);
    const outPath = path.join(DIR, newName);

    const inSize = (await stat(inPath)).size;

    await sharp(inPath)
      .webp({ quality: 82, effort: 5 })
      .toFile(outPath);

    const outSize = (await stat(outPath)).size;
    totalIn += inSize;
    totalOut += outSize;

    const reduction = ((1 - outSize / inSize) * 100).toFixed(1);
    console.log(
      `${original.slice(0, 60)}…  ->  ${newName}  ` +
      `(${(inSize / 1024 / 1024).toFixed(2)} MB -> ${(outSize / 1024 / 1024).toFixed(2)} MB, -${reduction}%)`
    );
    renames.push({ original, newName });
    i++;
  }
}

console.log('');
console.log(`TOTAL: ${(totalIn / 1024 / 1024).toFixed(2)} MB -> ${(totalOut / 1024 / 1024).toFixed(2)} MB ` +
            `(saved ${((1 - totalOut / totalIn) * 100).toFixed(1)}%)`);
console.log(`Converted ${renames.length} files. Originals (.png) NOT deleted yet — review the .webp output first.`);
