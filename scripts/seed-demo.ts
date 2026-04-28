/**
 * Seed a demo project that exercises every feature of the wizard.
 *
 * After running, sign in as the dev autologin user and you'll find:
 *   - 1 Org (Demo Ingenieurbüro)
 *   - 1 Project (Demo-Bemessung Musterhausen)
 *   - 6 calculations across the DWA-A-201 worksheet chain, each in a
 *     different status to demonstrate the workflow:
 *       A201-01: approved   (project setup)
 *       A201-04: approved   (catchment area — supplies EW downstream)
 *       A201-05: submitted  (system selection — sitting in the inbox)
 *       A201-06: changes_requested  (with reviewer comment)
 *       A201-07: draft      (with violated thresholds — to demo the
 *                           Compliance Summary panel)
 *       A201-21: draft      (final compliance report — empty)
 *   - 2 decisions captured (system selection, screen presence)
 *   - Cross-worksheet derivedFrom values pre-populated from upstream
 *     calcs (so opening A201-06 shows EW already pre-filled from A201-04)
 *
 * Usage:
 *   pnpm tsx scripts/seed-demo.ts [--user-email leadership@ekowai.com]
 */
import { config } from 'dotenv';
import postgres from 'postgres';

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

interface CalcSeed {
  worksheetId: string;
  name: string;
  inputs: Record<string, number | string | boolean | null>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  approvalAction?: 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  approvalComment?: string;
  rationale?: string;
}

const PROJECT_NAME = 'Demo-Bemessung Musterhausen';
const ORG_NAME = 'Demo Ingenieurbüro Müller & Partner';

const CALCS: CalcSeed[] = [
  {
    worksheetId: 'A201-01',
    name: 'Projektregistrierung',
    inputs: {
      Project_Identifier: 'KA-Musterhausen-2026',
      Project_Location: 'Musterhausen',
      Authored_By: 'Dipl.-Ing. Anna Mustermann',
      Wastewater_Type: 'Häuslich',
      Size_Class_Indicator: 'GK 2',
    },
    status: 'approved',
    approvalAction: 'approved',
    approvalComment: 'Standortdaten plausibel. Freigegeben für weitere Bemessung.',
    rationale:
      'Projekt für die Gemeinde Musterhausen, Größenklasse 2 (1.000–5.000 EW). Häusliches Abwasser ohne nennenswerten Industrieanteil. Vorgesehen ist eine Teichanlage mit vorgeschalteter Vorklärung gemäß DWA-A-201.',
  },
  {
    worksheetId: 'A201-04',
    name: 'Einzugsgebiet & Anschlussgrößen',
    inputs: {
      EZ: 1500,
      EGW: 300,
      sewer_system: 'Mischsystem',
      EW_BSB5: 1800,
      A_E_Mi: 12.5,
    },
    status: 'approved',
    approvalAction: 'approved',
    approvalComment: 'Einwohnerwerte stimmen mit Gemeindedaten überein.',
    rationale:
      'Einwohnerzahl 1.500 nach Gemeindeauskunft, gewerblicher Einwohnergleichwert 300 (zwei kleinere Betriebe). Mischwasserkanalisation bestehend. Gesamt-EW = 1.800.',
  },
  {
    worksheetId: 'A201-05',
    name: 'Verfahrensauswahl Teichsystem',
    inputs: {
      EW_BSB5: 1800,
      sewer_system: 'Mischsystem',
      A_E_Mi: 12.5,
    },
    status: 'submitted',
    approvalAction: 'submitted',
    rationale:
      'Bei EW = 1.800 < 5.000 sind Teichanlagen zulässig. Aufgrund der begrenzten Fläche wird eine belüftete Teichanlage in Reihe Vorklärung → Belüfteter Teich → Schönungsteich vorgeschlagen.',
  },
  {
    worksheetId: 'A201-06',
    name: 'Absetzteich — Bemessung',
    inputs: {
      T_01: 0.5, // V_EW = 0.5 m³/E (compliant)
      T_02: 0.15, // Schlammraum (compliant)
      T_03: 1.2, // t_R = 1.2 d (compliant)
      T_04: 0.04, // Fließgeschwindigkeit (compliant)
      T_05: 18, // Schlammanfall (compliant)
      T_30: 1.8, // Tiefe (compliant)
    },
    status: 'changes_requested',
    approvalAction: 'changes_requested',
    approvalComment:
      'Bitte den Sicherheitszuschlag auf den Schlammraum (T-02) deutlicher dokumentieren. Volumen reicht knapp aus.',
    rationale:
      'Absetzteich für 1.800 EW mit V_EW = 0,5 m³/E (ohne zusätzlichen Sicherheitszuschlag). Aufenthaltszeit bei Trockenwetter t_R = 1,2 d > Mindestwert 1,0 d. Fließgeschwindigkeit am Ablauf weit unter Grenzwert.',
  },
  {
    worksheetId: 'A201-07',
    name: 'Unbelüfteter Teich — Bemessung',
    inputs: {
      T_06: 6.5, // A_EW (VIOLATION — needs ≥ 8 with upstream settlement)
      T_07: 0.9, // Tiefe (VIOLATION — needs ~1.0)
      T_08: 4.5, // Aufenthaltszeit (compliant)
      T_31: 1.0, // Wassertiefe (compliant)
    },
    status: 'draft',
  },
  {
    worksheetId: 'A201-21',
    name: 'Compliance-Bemessungsbericht',
    inputs: {},
    status: 'draft',
  },
];

const DECISIONS = [
  {
    worksheetId: 'A201-05',
    decisionPointId: 'A201-05-DP-1',
    choice: 'belueftet_teich',
    rationale:
      'Aufgrund Flächenbegrenzung am Standort und der Ausbaugröße 1.800 EW wird ein belüfteter Teich gewählt. Vorgeschalteter Absetzteich erforderlich.',
  },
  {
    worksheetId: 'A201-04',
    decisionPointId: 'A201-04-DP-2',
    choice: 'screen_inflow',
    rationale: 'Vorhandene Mischwasserkanalisation transportiert grobstoffhaltiges Abwasser. Automatische Rechenanlage am Zulauf.',
  },
];

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
  // Make sure profile row exists (the on-signup trigger should have done this,
  // but be defensive).
  await sql`
    INSERT INTO profiles (id, email, full_name)
    VALUES (${user.id}, ${USER_EMAIL}, 'Demo Engineer')
    ON CONFLICT (id) DO NOTHING
  `;
  return user.id;
}

async function seed() {
  console.log(`Seeding demo data for ${USER_EMAIL} ...`);

  const userId = await getOrCreateUser();

  // Org
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

  // Project
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

  // Calculations
  const calcIdByWorksheet = new Map<string, string>();
  for (const c of CALCS) {
    const [calc] = (await sql`
      INSERT INTO calculations (
        project_id, org_id, regulation_code, regulation_version,
        worksheet_id, name, inputs, results, rationale, created_by
      )
      VALUES (
        ${project.id}, ${org.id}, 'DWA-A-201', 'v3.1',
        ${c.worksheetId}, ${c.name}, ${sql.json(c.inputs)},
        ${sql.json({})}, ${c.rationale ?? null}, ${userId}
      )
      RETURNING id
    `) as Array<{ id: string }>;
    calcIdByWorksheet.set(c.worksheetId, calc.id);

    if (c.approvalAction) {
      await sql`
        INSERT INTO approvals (calculation_id, org_id, action, reviewer_id, comment)
        VALUES (
          ${calc.id}, ${org.id}, ${c.approvalAction},
          ${c.approvalAction === 'submitted' ? null : userId},
          ${c.approvalComment ?? null}
        )
      `;
      // sync_calc_status_from_approval trigger flips calc.status.
    }
    console.log(
      `  calc ${c.worksheetId.padEnd(8)} → ${calc.id.slice(0, 8)} (${c.status})`,
    );
  }

  // Decisions
  for (const d of DECISIONS) {
    const calcId = calcIdByWorksheet.get(d.worksheetId);
    if (!calcId) continue;
    await sql`
      INSERT INTO decisions (
        calculation_id, org_id, decision_point_id, choice, rationale, made_by
      )
      VALUES (
        ${calcId}, ${org.id}, ${d.decisionPointId}, ${d.choice},
        ${d.rationale ?? null}, ${userId}
      )
      ON CONFLICT (calculation_id, decision_point_id) DO NOTHING
    `;
    console.log(`  decision ${d.decisionPointId} → ${d.choice}`);
  }

  console.log('\nDone. Open the app, sign in, and explore:');
  console.log(`  → Project: "${PROJECT_NAME}"`);
  console.log(`  → 6 calcs across A201-01/04/05/06/07/21 with mixed statuses`);
  console.log(
    `  → Inbox shows 1 pending review (A201-05); calc page shows pre-filled\n` +
      `    derived inputs on A201-06 from the approved A201-04.`,
  );
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
