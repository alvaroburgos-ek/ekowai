import de from '../src/lib/i18n/messages/de.json';
import en from '../src/lib/i18n/messages/en.json';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, key)
      : [key];
  });
}

const deKeys = new Set(flatten(de));
const enKeys = new Set(flatten(en));

const missingInEn = [...deKeys].filter((k) => !enKeys.has(k));
const missingInDe = [...enKeys].filter((k) => !deKeys.has(k));

if (missingInEn.length || missingInDe.length) {
  if (missingInEn.length) {
    console.error('Keys in DE but missing in EN:');
    missingInEn.forEach((k) => console.error('  -', k));
  }
  if (missingInDe.length) {
    console.error('Keys in EN but missing in DE:');
    missingInDe.forEach((k) => console.error('  -', k));
  }
  process.exit(1);
}

console.log(`✓ i18n coverage OK (${deKeys.size} keys in both DE and EN)`);
