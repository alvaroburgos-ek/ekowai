/**
 * Seed 3 realistic projects using the local bypass user.
 * Takes every 2nd worksheet (11 total) and spreads them across the projects.
 *
 * Projects:
 *   1 — KA Musterhausen (A201-01, 03, 05, 07, 09) — GK 2, Teichanlage
 *   2 — KA Kleindorf   (A201-11, 13, 15, 17)       — GK 1, ländlich
 *   3 — KA Bergdorf    (A201-19, 21)                — GK 1, Ausbau
 *
 * Usage:
 *   pnpm tsx scripts/seed-multi-project.ts
 *
 * Requires .env.local with DATABASE_URL and BYPASS_AUTH_USER_ID set.
 */
import { config } from 'dotenv';
import postgres from 'postgres';
import { ALL_WORKSHEETS } from '../src/lib/worksheets/DWA-A-201/v3.1/index';
import { compute } from '../src/lib/engine/index';
import type { InputField, Worksheet } from '../src/lib/engine/types';

config({ path: '.env.local' });

const BYPASS_USER_ID = process.env.BYPASS_AUTH_USER_ID;
if (!BYPASS_USER_ID) throw new Error('BYPASS_AUTH_USER_ID not set in .env.local');

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set in .env.local');

const sql = postgres(url, { prepare: false });

// ── Anchor values shared across all three plants ───────────────────────────
const ANCHORS: Record<string, number | string> = {
  EZ: 1200, EGW: 200, EW: 1400, EW_BSB5: 1400, EW_BSB_5: 1400,
  A_E_Mi: 9.5, sewer_system: 'Mischsystem',
  Q_DW: 280, Q_M: 24, Q_max: 24, Q_S: 40, Q_DR: 10, Q_Dr: 10,
  BSB5_in: 240, BSB5_load_kgd: 84,
  h: 2.0,
  treatment_class: 'N',
  Project_Identifier: 'KA-2026',
  Project_Location: 'Bayern',
  Authored_By: 'Dipl.-Ing. K. Maier',
  Wastewater_Type: 'Häuslich',
  Size_Class_Indicator: 'GK 1',
  Selected_Pond_System: 'Belüftete Teiche mit Vorklärung',
  note: 'Wert gemäß Ausführungsplanung.',
  t_R_M: 0.5, alpha_O: 1.5, h_min: 2.0,
};

interface ThresholdLite { ref: string; rule: { kind: 'lte' | 'gte' | 'eq'; value: number } }

function valueFor(
  field: InputField,
  thresholds: ThresholdLite[],
  upstream: Map<string, Record<string, unknown>>,
  opts: { violate?: boolean } = {},
): number | string | boolean | null {
  if (field.derivedFrom) {
    const u = upstream.get(field.derivedFrom.worksheetId);
    if (u?.[field.id] !== undefined && u[field.id] !== null) return u[field.id] as number | string | boolean;
    if (field.id in ANCHORS) return ANCHORS[field.id];
    return null;
  }
  if (field.id in ANCHORS) return ANCHORS[field.id];
  if (field.type === 'select' && field.options?.length) return field.options[0].value;
  if (field.type === 'boolean') return false;
  if (field.type === 'text') return ANCHORS.note as string;

  const matching = thresholds.find((t) => t.ref === field.id);
  if (matching) {
    const v = matching.rule.value;
    if (matching.rule.kind === 'gte') return opts.violate ? v * 0.5 : v * 1.05;
    if (matching.rule.kind === 'lte') return opts.violate ? v * 1.6 : v * 0.85;
    return v;
  }
  if (field.defaultValue !== undefined) return field.defaultValue as number;
  const unit = (field.unit ?? '').toLowerCase();
  if (unit.includes('m³/e') || unit.includes('m3/e')) return 0.5;
  if (unit === 'm') return 2.0;
  if (unit.includes('m²')) return 80;
  if (unit.includes('m³')) return 180;
  if (unit === 'd') return 1.5;
  if (unit === 'h') return 2.0;
  if (unit === 'e') return 1400;
  if (unit.includes('kg')) return 45;
  if (unit.includes('g/(e')) return 60;
  if (unit.includes('mg/l')) return 95;
  return 1.0;
}

function buildInputs(ws: Worksheet, prior: Map<string, { inputs: Record<string, unknown>; results: Record<string, number> }>, violate = false) {
  const upstream = new Map<string, Record<string, unknown>>();
  for (const [wsId, sc] of prior.entries()) upstream.set(wsId, { ...sc.inputs, ...sc.results });
  const thresholds: ThresholdLite[] = ws.thresholds.map((t) => ({ ref: t.ref, rule: t.rule }));
  const inputs: Record<string, number | string | boolean | null> = {};
  for (const f of ws.inputs) inputs[f.id] = valueFor(f, thresholds, upstream, { violate });
  const result = compute(ws, inputs);
  return { inputs, results: result.computed };
}

// ── Project definitions ────────────────────────────────────────────────────
interface ProjectDef {
  name: string;
  client: string;
  location: string;
  type: string;
  worksheetIds: string[];
  calcs: Record<string, {
    status: 'draft' | 'submitted' | 'approved' | 'changes_requested';
    rationale: string;
    comment?: string;
    violate?: boolean;
  }>;
  decisions: Record<string, { choice: string; rationale: string }>;
}

const PROJECTS: ProjectDef[] = [
  {
    name: 'Kläranlage Musterhausen — Neubau GK 2',
    client: 'Gemeinde Musterhausen',
    location: 'Musterhausen, BY',
    type: 'Teichkläranlage GK 2',
    worksheetIds: ['A201-01', 'A201-03', 'A201-05', 'A201-07', 'A201-09'],
    calcs: {
      'A201-01': {
        status: 'approved',
        rationale: 'Projektregistrierung für KA Musterhausen. Häusliches Abwasser, 1.200 Einwohner zzgl. 200 EGW aus Gewerbe. GK 2 (1.000–5.000 EW). Teichanlage mit vorgeschalteter Vorklärung als Vorzugsvariante.',
        comment: 'Stammdaten vollständig und plausibel. Freigegeben.',
      },
      'A201-03': {
        status: 'approved',
        rationale: 'Fremdwasseranteil auf 25 % geschätzt (Bestandskanalisation, Baujahr 1985). Einwohnergleichwert aus Gewerbebetrieben nach DWA-A-131 ermittelt. Gesamt-EW = 1.400.',
        comment: 'Fremdwasserabschätzung durch Kamerabefahrung belegt.',
      },
      'A201-05': {
        status: 'submitted',
        rationale: 'Aufgrund der Ausbaugröße (< 5.000 EW) und der verfügbaren Grundstücksfläche (3,2 ha) wird eine belüftete Teichanlage in Reihenschaltung gewählt: Absetzteich → Belüfteter Teich → Schönungsteich. Alternative Belebungsanlage wurde aus Kostengründen verworfen.',
      },
      'A201-07': {
        status: 'draft',
        violate: true,
        rationale: 'Variantenstudie unbelüfteter Teich: spez. Oberfläche unterschreitet Mindestwert deutlich. Variante nicht weiterverfolgt — wird zur Dokumentation der Alternativenprüfung archiviert.',
      },
      'A201-09': {
        status: 'changes_requested',
        rationale: 'Nachklärstufe, Aufenthaltszeit bei Spitzendurchfluss t_R = 1,8 h. Tiefe 1,2 m. Beruhigungszone gemäß DWA-A-201 §5.5 vorgesehen.',
        comment: 'Bitte die hydraulische Kurzschlussfreiheit mit Windrichtungsstudie belegen — Teichform (L:B) noch nicht ausreichend begründet.',
      },
    },
    decisions: {
      'A201-05-DP-1': {
        choice: 'belueftet_teich',
        rationale: 'Belüfteter Teich wegen Flächenbegrenzung und wirtschaftlicher Vorteilhaftigkeit gegenüber Belebungsanlage bei dieser Ausbaugröße ausgewählt.',
      },
    },
  },
  {
    name: 'Kläranlage Kleindorf — Ertüchtigung',
    client: 'Abwasserzweckverband Kleindorf',
    location: 'Kleindorf, BW',
    type: 'Bestandsanlage GK 1',
    worksheetIds: ['A201-11', 'A201-13', 'A201-15', 'A201-17'],
    calcs: {
      'A201-11': {
        status: 'approved',
        rationale: 'Geotechnische Beurteilung Standort Kleindorf: Schluff-Ton-Gemisch, k_f = 2·10⁻⁹ m/s. Naturliche Dichtung knapp ausreichend (DWA-Grenzwert 10⁻⁹ m/s). Zur Sicherheit wird eine HDPE-Folie als Zusatzdichtung vorgesehen.',
        comment: 'Geotechnisches Gutachten liegt vor. Folienplanung akzeptiert.',
      },
      'A201-13': {
        status: 'approved',
        rationale: 'Teichgeometrie: L:B = 3,5:1, Böschung 1:2,5 (standsicher nach Baugrundgutachten), Wassertiefe 1,8 m. Windschutz durch bestehenden Gehölzstreifen Nordseite ausreichend.',
        comment: 'Geometriedaten nachvollziehbar und regelkonform.',
      },
      'A201-15': {
        status: 'approved',
        rationale: 'Pumpstation Zulauf: 2 Tauchmotorpumpen (Duplex), Q_max = 24 m³/h, geodätische Förderhöhe 3,5 m. Betriebspunkt liegt im Wirkungsgradoptimum. Notstromaggregat vorhanden.',
        comment: 'Pumpendimensionierung geprüft und freigegeben.',
      },
      'A201-17': {
        status: 'draft',
        rationale: 'Betriebsführung: Personalbedarf lt. DWA-A-201 §8 für GK 1 = 0,2 VZÄ. Fernüberwachung über Mobilfunk-RTU. Wartungsvertrag mit regionaler Fachfirma in Vorbereitung.',
      },
    },
    decisions: {
      'A201-13-DP-4': {
        choice: 'kuenstliche_dichtung',
        rationale: 'Trotz knapp ausreichendem k_f-Wert wird aus Vorsorgegründen und auf Anraten des Kreisumweltamts eine HDPE-Folie verlegt.',
      },
    },
  },
  {
    name: 'Teichkläranlage Bergdorf — Erweiterung Schönungsteich',
    client: 'Gemeinde Bergdorf',
    location: 'Bergdorf, TH',
    type: 'Erweiterung Bestandsanlage',
    worksheetIds: ['A201-19', 'A201-21'],
    calcs: {
      'A201-19': {
        status: 'approved',
        rationale: 'Eigenüberwachung nach EÜV TH: BSB5-Beprobung wöchentlich am Zulauf und Ablauf. Sichttiefenmessung mit Secchi-Scheibe monatlich. Meldepflicht bei Überschreitung der Überwachungswerte innerhalb 24 h an UWB.',
        comment: 'Eigenüberwachungsplan entspricht Thüringer EÜV. Freigegeben.',
      },
      'A201-21': {
        status: 'draft',
        rationale: 'Schlussrechnung und Compliance-Gesamtauswertung wird nach Abschluss der Detailbemessung (Schönungsteich-Ausbau) ergänzt. Zieldatum: Q3 2026.',
      },
    },
    decisions: {},
  },
];

async function seed() {
  console.log(`\nSeed-Multi-Project — Bypass-User: ${BYPASS_USER_ID}\n`);

  // Verify bypass user exists in profiles
  const [prof] = await sql`SELECT id FROM profiles WHERE id = ${BYPASS_USER_ID!} LIMIT 1` as Array<{ id: string }>;
  if (!prof) {
    console.error('Bypass user not found in profiles. Run seed-bypass-user.ts first.');
    process.exit(1);
  }

  // Fetch bypass user's org (from seed-bypass-user)
  const [membership] = await sql`
    SELECT org_id FROM org_members WHERE user_id = ${BYPASS_USER_ID!} LIMIT 1
  ` as Array<{ org_id: string }>;
  if (!membership) {
    console.error('Bypass user has no org. Run seed-bypass-user.ts first.');
    process.exit(1);
  }
  const orgId = membership.org_id;
  console.log(`  Using org: ${orgId}\n`);

  // Collect all worksheets by id for quick lookup
  const wsMap = new Map(ALL_WORKSHEETS.map((w) => [w.id, w]));

  for (const projDef of PROJECTS) {
    console.log(`► ${projDef.name}`);

    const [project] = await sql`
      INSERT INTO projects (org_id, name, client_name, location, project_type, created_by)
      VALUES (${orgId}, ${projDef.name}, ${projDef.client}, ${projDef.location}, ${projDef.type}, ${BYPASS_USER_ID!})
      RETURNING id
    ` as Array<{ id: string }>;
    console.log(`  project_id = ${project.id}`);

    const prior = new Map<string, { inputs: Record<string, unknown>; results: Record<string, number> }>();

    for (const wsId of projDef.worksheetIds) {
      const ws = wsMap.get(wsId);
      if (!ws) { console.warn(`  ⚠ Worksheet ${wsId} not found — skipping`); continue; }

      const meta = projDef.calcs[wsId] ?? { status: 'approved' as const, rationale: 'Bemessung gemäß DWA-A-201.' };
      const { inputs, results } = buildInputs(ws, prior, !!meta.violate);

      const [calc] = await sql`
        INSERT INTO calculations (
          project_id, org_id, regulation_code, regulation_version,
          worksheet_id, name, inputs, results, rationale, status, created_by
        ) VALUES (
          ${project.id}, ${orgId}, ${ws.regulation}, ${ws.regulationVersion},
          ${wsId}, ${wsId + ' — ' + ws.titleDe},
          ${sql.json(inputs)}, ${sql.json(results)},
          ${meta.rationale ?? null},
          ${'draft'},
          ${BYPASS_USER_ID!}
        ) RETURNING id
      ` as Array<{ id: string }>;

      prior.set(wsId, { inputs, results });

      // Approval row + status update
      if (meta.status !== 'draft') {
        const approvalAction = meta.status === 'submitted' ? 'submitted' : meta.status;
        await sql`
          INSERT INTO approvals (calculation_id, org_id, action, reviewer_id, comment)
          VALUES (
            ${calc.id}, ${orgId}, ${approvalAction},
            ${meta.status === 'submitted' ? null : BYPASS_USER_ID!},
            ${meta.comment ?? null}
          )
        `;
        // Sync status on calculations row
        await sql`UPDATE calculations SET status = ${meta.status} WHERE id = ${calc.id}`;
      }

      // Decisions
      for (const dp of ws.decisionPoints) {
        const dr = projDef.decisions[dp.id];
        if (!dr) continue;
        const choice = dp.options.find((o) => o.value === dr.choice)?.value ?? dp.options[0]?.value;
        if (!choice) continue;
        await sql`
          INSERT INTO decisions (calculation_id, org_id, decision_point_id, choice, rationale, made_by)
          VALUES (${calc.id}, ${orgId}, ${dp.id}, ${choice}, ${dr.rationale}, ${BYPASS_USER_ID!})
          ON CONFLICT (calculation_id, decision_point_id) DO NOTHING
        `;
      }

      const inputCount = Object.keys(inputs).length;
      const resultCount = Object.keys(results).length;
      console.log(`  ${wsId.padEnd(10)} ${meta.status.padEnd(20)} inputs=${inputCount} results=${resultCount}`);
    }

    console.log();
  }

  console.log('Done. Öffne http://localhost:3001/de/projects um die Projekte zu sehen.\n');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sql.end({ timeout: 5 }));
