// READ-ONLY: dump the stored values of one project/standard as JSON (same auth pattern as prod-query.mjs; URL never printed).
import fs from 'node:fs'; import path from 'node:path'; import postgres from 'postgres';
import { fileURLToPath } from 'node:url'; const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const m = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL_PROD=(.+)$/m);
const sql = postgres(m[1].trim().replace(/^"|"$/g, ''), { max: 1, prepare: false, connection: { default_transaction_read_only: 'on' } });
const [projectId, std, out] = process.argv.slice(2);
const rows = await sql.begin('read only', (tx) => tx`
  select w.code as ws, f.symbol, f.id as field_id, f.data_type, pp.source_type,
         pp.value_number, pp.value_text, pp.value_enum, pp.value_boolean, pp.value_date, pp.value_json
  from project_parameters pp join fields f on f.id = pp.field_id
  join worksheet_templates w on w.id = f.worksheet_template_id join standards s on s.id = w.standard_id
  where pp.project_id = ${projectId} and s.code = ${std} and f.active order by w.code, f.order_index, f.symbol`);
fs.writeFileSync(out, JSON.stringify(rows, null, 1)); console.log(rows.length, 'rows →', out); await sql.end();
