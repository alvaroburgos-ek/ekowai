/**
 * Seed a fully-complete demo project.
 *
 *   - 1 Org, 1 Project
 *   - 22 calculations (one per DWA-A-201 worksheet)
 *   - Every input filled with a realistic value
 *   - results jsonb populated by running the engine on each calc
 *   - Mixed status to exercise every workflow surface:
 *       most: approved (with reviewer comment)
 *       A201-05: submitted (sits in inbox)
 *       A201-09: changes_requested (with reviewer comment)
 *       A201-07: draft, intentionally violated thresholds (compliance demo)
 *       A201-21: draft empty (final-summary starting point)
 *   - Decisions captured for every DP-owning worksheet
 *   - Cross-worksheet derived inputs prefilled from upstream
 *
 * Usage:
 *   pnpm tsx scripts/seed-demo.ts [--user-email=leadership@ekowai.com]
 *
 * Run wipe first if you want a clean slate:
 *   pnpm tsx scripts/wipe-test-data.ts --yes
 */
import { config } from 'dotenv';
import postgres from 'postgres';
import { ALL_WORKSHEETS } from '../src/lib/worksheets/DWA-A-201/v3.1/index';
import { compute } from '../src/lib/engine/index';
import type { InputField, Worksheet } from '../src/lib/engine/types';

config({ path: '.env.local' });

const userEmailFlag = process.argv.find((a) => a.startsWith('--user-email='));
const USER_EMAIL =
  userEmailFlag?.split('=')[1] ??
  process.env.DEV_AUTOLOGIN_EMAIL ??
  'leadership@ekowai.com';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

const PROJECT_NAME = 'Demo-Bemessung Musterhausen — KA für 1.800 EW';
const ORG_NAME = 'Demo Ingenieurbüro Müller & Partner';

// ---- Realistic engineering anchor values for the fictional plant ----
// All worksheet inputs draw from this map by their sanitized id;
// fall back to threshold value or unit heuristic if not listed here.
const ANCHOR_VALUES: Record<string, number | string> = {
  // Population + flow basis (A201-04)
  EZ: 1500,
  EGW: 300,
  EW: 1800,
  EW_BSB5: 1800,
  EW_BSB_5: 1800,
  // Catchment
  A_E_Mi: 12.5,
  sewer_system: 'Mischsystem',
  // Flow
  Q_DW: 360, // m³/d  (200 L/(EW·d) × 1800)
  Q_M: 30, // m³/h peak mixed
  Q_max: 30,
  Q_S: 50, // peak storm
  Q_DR: 12, // m³/h throttled
  Q_Dr: 12,
  // BOD
  BSB5_in: 250,
  BSB5_load_kgd: 108, // 60 g/(EW·d) × 1800 ≈ 108 kg/d
  // Geometric
  h: 2.0,
  // Process choices
  treatment_class: 'N',
  Project_Identifier: 'KA-Musterhausen-2026',
  Project_Location: 'Musterhausen, BY',
  Authored_By: 'Dipl.-Ing. Anna Mustermann',
  Wastewater_Type: 'Häuslich',
  Size_Class_Indicator: 'GK 2',
  Selected_Pond_System: 'Belüftete Teiche mit Vorklärung',
  // Misc fallbacks
  note: 'Standortangabe vom Vermessungsbüro übernommen.',
  t_R_M: 0.5,
  alpha_O: 1.5,
  h_min: 2.0,
};

interface ThresholdLite {
  ref: string;
  rule: { kind: 'lte' | 'gte' | 'eq'; value: number };
}

/**
 * Pick a realistic value for an input field.
 * Priority: anchor → matching threshold (compliant side) → defaultValue →
 * unit heuristic → 1.
 */
function valueFor(
  field: InputField,
  thresholds: ThresholdLite[],
  upstreamInputs: Map<string, Record<string, unknown>>,
  options: { violate?: boolean } = {},
): number | string | boolean | null {
  // Derived: pull from upstream calc by sanitized id
  if (field.derivedFrom) {
    const u = upstreamInputs.get(field.derivedFrom.worksheetId);
    if (u && u[field.id] !== undefined && u[field.id] !== null) {
      return u[field.id] as number | string | boolean | null;
    }
    // Fallback to anchor map
    if (field.id in ANCHOR_VALUES) return ANCHOR_VALUES[field.id];
    return null;
  }

  // Anchor map
  if (field.id in ANCHOR_VALUES) return ANCHOR_VALUES[field.id];

  // Select: pick first option
  if (field.type === 'select' && field.options && field.options.length > 0) {
    return field.options[0].value;
  }
  if (field.type === 'boolean') return false;
  if (field.type === 'text') return ANCHOR_VALUES.note as string;

  // Number — try matching threshold to land on or near the rule edge
  const matching = thresholds.find((t) => t.ref === field.id);
  if (matching) {
    const v = matching.rule.value;
    if (matching.rule.kind === 'gte') {
      // To violate: pick below; to comply: pick at-or-above
      return options.violate ? v * 0.6 : v;
    }
    if (matching.rule.kind === 'lte') {
      return options.violate ? v * 1.4 : v;
    }
    return v;
  }

  // defaultValue from contract
  if (field.defaultValue !== undefined) return field.defaultValue as number;

  // Unit-based heuristic
  const unit = (field.unit ?? '').toLowerCase();
  if (unit.includes('m³/e') || unit.includes('m3/e')) return 0.5;
  if (unit === 'm') return 2.0;
  if (unit.includes('m²')) return 100;
  if (unit.includes('m³')) return 200;
  if (unit === 'd') return 1.5;
  if (unit === 'h') return 2.0;
  if (unit === 'e') return 1800;
  if (unit.includes('kg')) return 50;
  if (unit.includes('g/(e')) return 60;
  if (unit.includes('mg/l')) return 100;
  return 1.0;
}

interface CalcStatus {
  status: 'draft' | 'submitted' | 'approved' | 'changes_requested';
  rationale?: string;
  comment?: string;
  violate?: boolean;
}

const STATUS_MAP: Record<string, CalcStatus> = {
  'A201-01': {
    status: 'approved',
    rationale:
      'Projektregistrierung für KA Musterhausen, GK 2 (1.000–5.000 EW). Häusliches Abwasser ohne nennenswerten Industrieanteil. Vorgesehen ist eine Teichanlage mit vorgeschalteter Vorklärung gemäß DWA-A-201.',
    comment: 'Stammdaten plausibel. Freigegeben.',
  },
  'A201-02': {
    status: 'approved',
    rationale: 'Mengen- und Frachtdaten anhand Gemeindestatistik und Spurenmessung 2025.',
    comment: 'Frachtwerte typisch für GK 2.',
  },
  'A201-03': {
    status: 'approved',
    rationale:
      'Fremdwasseranteil mit 25 % angesetzt (Mischwasserkanal älteren Bestands). EW = 1.500 + 300 = 1.800.',
    comment: 'Fremdwasserabschätzung dokumentiert.',
  },
  'A201-04': {
    status: 'approved',
    rationale:
      'Einwohnerzahl 1.500 nach Gemeindeauskunft, gewerblicher Einwohnergleichwert 300 (zwei kleinere Betriebe). Mischwasserkanalisation bestehend; Einzugsgebiet 12,5 ha.',
    comment: 'Einwohnerwerte mit Meldedaten der Gemeinde abgestimmt.',
  },
  'A201-05': {
    status: 'submitted',
    rationale:
      'Bei EW = 1.800 < 5.000 sind Teichanlagen zulässig. Aufgrund der begrenzten Fläche wird eine belüftete Teichanlage in Reihe Vorklärung → Belüfteter Teich → Schönungsteich gewählt.',
  },
  'A201-06': {
    status: 'approved',
    rationale:
      'Absetzteich für 1.800 EW mit V_EW = 0,5 m³/E. Aufenthaltszeit bei Trockenwetter t_R = 1,2 d > Mindestwert 1,0 d. Fließgeschwindigkeit am Ablauf weit unter Grenzwert.',
    comment: 'Bemessung des Absetzteichs nachvollziehbar.',
  },
  'A201-07': {
    status: 'draft',
    violate: true, // produce visible violations for the compliance demo
    rationale:
      'Variantenstudie: unbelüfteter Teich. Spez. Oberfläche unter Mindestwert — Variante wird voraussichtlich nicht gewählt; bewusst zur Dokumentation der Alternativenprüfung erfasst.',
  },
  'A201-08': {
    status: 'approved',
    rationale:
      'Belüfteter Hauptteich, B_R = 22 g/(m³·d) < 25 g/(m³·d), t_R = 5,5 d > 5 d, OV-Verhältnis = 1,8 > 1,5. Leistungsdichte 2 W/m³.',
    comment: 'Belüftung ausreichend dimensioniert.',
  },
  'A201-09': {
    status: 'changes_requested',
    rationale:
      'Nachklärteich nach DWA-A-201 §5.5. Aufenthaltszeit bei Spitzendurchfluss erfüllt; Tiefe 1,3 m.',
    comment:
      'Bitte die Bemessungsannahme zur Beruhigungszone explizit dokumentieren — bei Stoßbelastung fehlt der Nachweis.',
  },
  'A201-10': {
    status: 'approved',
    rationale: 'Schönungsteich als Polizeifilter, Aufenthaltszeit 8 h.',
    comment: 'Schönungsteich-Bemessung freigegeben.',
  },
  'A201-11': {
    status: 'approved',
    rationale: 'Boden-Permeabilität k_f = 1·10⁻⁹ m/s; künstliche Dichtung erforderlich.',
    comment: 'Folie nach DWA-A-117 vorgesehen.',
  },
  'A201-12': {
    status: 'approved',
    rationale:
      'Mischwasserbehandlung Fall II (Regenüberlaufbecken vorhanden). Drosselabfluss 12 m³/h.',
    comment: 'Mischwasserkonzept abgestimmt.',
  },
  'A201-13': {
    status: 'approved',
    rationale:
      'Geometrieparameter: Böschung 1:2, L:B = 4:1, Tiefe 2,0 m. Erdbecken ausreichend gedichtet.',
    comment: 'Geometrie plausibel.',
  },
  'A201-14': {
    status: 'approved',
    rationale: 'Regenüberlauf-Konzept vom Tiefbauamt übernommen.',
    comment: 'Bestehendes RÜ-Konzept akzeptiert.',
  },
  'A201-15': {
    status: 'approved',
    rationale: 'Pumpstation: 2 Pumpen, Q_max = 30 m³/h, Höhenunterschied 4,0 m.',
    comment: 'Pumpstation-Konzept passt.',
  },
  'A201-16': {
    status: 'approved',
    rationale: 'Bauwerke: Stahlbeton C30/37, XC4-Klasse für Wasserwechselzone.',
    comment: 'Materialwahl korrekt.',
  },
  'A201-17': {
    status: 'approved',
    rationale: 'Betriebsführung gemäß DWA-A-201 §8 — Personalbedarf 0,3 VZÄ.',
    comment: 'Betriebsplanung schlüssig.',
  },
  'A201-18': {
    status: 'approved',
    rationale: 'Entschlammung des Absetzteichs alle 5 Jahre per Tankwagen.',
    comment: 'Entschlammungsintervall realistisch.',
  },
  'A201-19': {
    status: 'approved',
    rationale: 'Eigenüberwachung: BSB5-Probenahme wöchentlich am Ablauf.',
    comment: 'Eigenüberwachungsplan akzeptiert.',
  },
  'A201-20': {
    status: 'approved',
    rationale: 'Wartung: jährliche Sichtprüfung Folie, halbjährlich Pumpen.',
    comment: 'Wartungskonzept akzeptiert.',
  },
  'A201-21': {
    status: 'draft',
    rationale: 'Compliance-Bericht — wird nach Abschluss aller Bemessungsblätter befüllt.',
  },
  'A201-22': {
    status: 'approved',
    rationale: 'Zusammenfassung mit allen verifizierten Bemessungsdaten.',
    comment: 'Bericht unterschriftsreif.',
  },
};

const DECISION_RATIONALES: Record<string, { choice: string; rationale: string }> = {
  'A201-05-DP-1': {
    choice: 'belueftet_teich',
    rationale:
      'Aufgrund Flächenbegrenzung am Standort und der Ausbaugröße 1.800 EW wird ein belüfteter Teich gewählt. Vorgeschalteter Absetzteich erforderlich.',
  },
  'A201-04-DP-2': {
    choice: 'screen_inflow',
    rationale:
      'Vorhandene Mischwasserkanalisation transportiert grobstoffhaltiges Abwasser. Automatische Rechenanlage am Zulauf.',
  },
  'A201-12-DP-3': {
    choice: 'rueb',
    rationale: 'Bestehendes Regenüberlaufbecken; keine Neubelegung nötig.',
  },
  'A201-13-DP-4': {
    choice: 'kuenstliche_dichtung',
    rationale: 'Boden-Permeabilität liegt über Grenzwert — künstliche Dichtung erforderlich.',
  },
  'A201-18-DP-5': {
    choice: 'tankwagen',
    rationale: 'Tankwagen-Entschlammung. Schlamm-Ausbringung auf landwirtschaftlicher Fläche genehmigt.',
  },
};

interface SeededCalc {
  worksheetId: string;
  inputs: Record<string, number | string | boolean | null>;
  results: Record<string, number>;
}

async function getOrCreateUser(): Promise<string> {
  const [user] =
    (await sql`SELECT id FROM auth.users WHERE email = ${USER_EMAIL} LIMIT 1`) as Array<{
      id: string;
    }>;
  if (!user) {
    console.error(
      `User '${USER_EMAIL}' not found in auth.users. Sign in once at /api/dev/login first.`,
    );
    process.exit(1);
  }
  await sql`
    INSERT INTO profiles (id, email, full_name)
    VALUES (${user.id}, ${USER_EMAIL}, 'Demo Engineer')
    ON CONFLICT (id) DO NOTHING
  `;
  return user.id;
}

function buildInputs(
  worksheet: Worksheet,
  prior: Map<string, SeededCalc>,
  violate: boolean,
): { inputs: Record<string, number | string | boolean | null>; results: Record<string, number> } {
  // Build the sibling-inputs map for derived lookup
  const upstream = new Map<string, Record<string, unknown>>();
  for (const [wsId, sc] of prior.entries()) {
    upstream.set(wsId, { ...sc.inputs, ...sc.results });
  }

  const thresholds: ThresholdLite[] = worksheet.thresholds.map((t) => ({
    ref: t.ref,
    rule: t.rule,
  }));

  const inputs: Record<string, number | string | boolean | null> = {};
  for (const f of worksheet.inputs) {
    inputs[f.id] = valueFor(f, thresholds, upstream, { violate });
  }

  // Run the engine to produce results
  const result = compute(worksheet, inputs);
  return { inputs, results: result.computed };
}

async function seed() {
  console.log(`Seeding fully-complete demo for ${USER_EMAIL} ...`);

  const userId = await getOrCreateUser();

  const [org] = (await sql`
    INSERT INTO orgs (name, slug, country)
    VALUES (${ORG_NAME}, ${'demo-' + Math.random().toString(36).slice(2, 7)}, 'DE')
    RETURNING id
  `) as Array<{ id: string }>;
  console.log(`  org_id = ${org.id}`);

  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${org.id}, ${userId}, 'owner')
    ON CONFLICT DO NOTHING
  `;

  const [project] = (await sql`
    INSERT INTO projects (org_id, name, client_name, location, project_type, created_by)
    VALUES (
      ${org.id},
      ${PROJECT_NAME},
      ${'Gemeinde Musterhausen'},
      ${'Musterhausen, BY'},
      ${'Kläranlage GK2'},
      ${userId}
    )
    RETURNING id
  `) as Array<{ id: string }>;
  console.log(`  project_id = ${project.id}`);

  const prior = new Map<string, SeededCalc>();

  for (const ws of ALL_WORKSHEETS) {
    const meta = STATUS_MAP[ws.id] ?? { status: 'approved' };
    // For empty-state demo, leave A201-21 inputs blank
    const isEmpty = ws.id === 'A201-21';
    const { inputs, results } = isEmpty
      ? { inputs: {}, results: {} }
      : buildInputs(ws, prior, !!meta.violate);

    const [calc] = (await sql`
      INSERT INTO calculations (
        project_id, org_id, regulation_code, regulation_version,
        worksheet_id, name, inputs, results, rationale, created_by
      )
      VALUES (
        ${project.id}, ${org.id}, ${ws.regulation}, ${ws.regulationVersion},
        ${ws.id}, ${ws.id + ' — ' + ws.titleDe}, ${sql.json(inputs)},
        ${sql.json(results)}, ${meta.rationale ?? null}, ${userId}
      )
      RETURNING id
    `) as Array<{ id: string }>;

    prior.set(ws.id, { worksheetId: ws.id, inputs, results });

    // Approval row drives status via the sync trigger
    if (meta.status !== 'draft') {
      await sql`
        INSERT INTO approvals (calculation_id, org_id, action, reviewer_id, comment)
        VALUES (
          ${calc.id}, ${org.id},
          ${meta.status === 'submitted' ? 'submitted' : meta.status},
          ${meta.status === 'submitted' ? null : userId},
          ${meta.comment ?? null}
        )
      `;
    }

    // Decisions: insert any DP that this worksheet owns
    for (const dp of ws.decisionPoints) {
      const dr = DECISION_RATIONALES[dp.id];
      if (!dr) continue;
      // Pick the option matching choice, or first option as fallback
      const choice =
        dp.options.find((o) => o.value === dr.choice)?.value ?? dp.options[0]?.value;
      if (!choice) continue;
      await sql`
        INSERT INTO decisions (
          calculation_id, org_id, decision_point_id, choice, rationale, made_by
        )
        VALUES (
          ${calc.id}, ${org.id}, ${dp.id}, ${choice}, ${dr.rationale}, ${userId}
        )
        ON CONFLICT (calculation_id, decision_point_id) DO NOTHING
      `;
    }

    console.log(
      `  ${ws.id.padEnd(8)} ${meta.status.padEnd(18)} inputs=${
        Object.keys(inputs).length
      } results=${Object.keys(results).length}`,
    );
  }

  console.log(`\nDone. ${ALL_WORKSHEETS.length} calcs in '${PROJECT_NAME}'.`);
  console.log(`  Sign in and explore the project — every status is represented.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
