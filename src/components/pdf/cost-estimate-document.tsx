import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './styles';
import { LetterheadHeader } from './letterhead-header';
import { ReportFooter } from './footer';
import type { CostEstimatePdfData, CostEstimateLinePdf } from '@/lib/pdf/build-cost-estimate';
import { SCHAETZUNG_BOUNDARY_SENTENCE } from '@/lib/costs/estimate';
import type { EurRange } from '@/lib/costs/estimate';

/**
 * Kostenschätzung (DIN 276) — a CLIENT deliverable (Slice E2).
 *
 * Honesty by layout: DIN-276-grouped lines with LOW/LIKELY/HIGH columns
 * (ranges, never a single figure), per-line price source + date, a structural
 * contingency row, the grand total as a RANGE, the snapshot id the quantities
 * are version-locked to, the accuracy-class boundary sentence, and a warning
 * banner INSIDE the document when the contingency is below 5 % or any price
 * basis is stale. The document must never look like a contractor's bid.
 */

function fmtEur(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} €`;
}

function fmtQty(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString('de-DE', { maximumFractionDigits: 3 });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

function fmtPct(v: string | number): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

const COL = {
  position: { flex: 1 } as const,
  qty: { width: 62, textAlign: 'right' } as const,
  price: { width: 58, textAlign: 'right' } as const,
};

function RangeCells({ r }: { r: EurRange }) {
  return (
    <>
      <Text style={[COL.price, { fontFamily: 'Courier', fontSize: 8.5 }]}>{fmtEur(r.low)}</Text>
      <Text style={[COL.price, { fontFamily: 'Courier', fontSize: 8.5 }]}>{fmtEur(r.likely)}</Text>
      <Text style={[COL.price, { fontFamily: 'Courier', fontSize: 8.5 }]}>{fmtEur(r.high)}</Text>
    </>
  );
}

function LineRow({ line }: { line: CostEstimateLinePdf }) {
  const q = Number(line.quantity);
  const range: EurRange = {
    low: q * Number(line.priceLowEur),
    likely: q * Number(line.priceLikelyEur),
    high: q * Number(line.priceHighEur),
  };
  const provenance = line.priceSource
    ? `Preis: ${line.priceSource}${line.priceDate ? `, Stand ${fmtDate(line.priceDate)}` : ''}`
    : 'Preis: manuelle Eingabe (ohne Katalogquelle)';
  return (
    <View style={styles.fieldRow} wrap={false}>
      <View style={COL.position}>
        <Text style={{ fontSize: 9 }}>{line.position}</Text>
        <Text style={{ fontSize: 7.5, color: colors.subtext }}>
          {provenance}
          {line.sourceSymbol ? `  ·  Menge aus ${line.sourceSymbol}` : ''}
        </Text>
      </View>
      <Text style={[COL.qty, { fontFamily: 'Courier', fontSize: 8.5 }]}>
        {`${fmtQty(line.quantity)}${line.unit ? ` ${line.unit}` : ''}`}
      </Text>
      <RangeCells r={range} />
    </View>
  );
}

export function CostEstimateDocument({ data }: { data: CostEstimatePdfData }) {
  const { estimate, totals } = data;

  // DIN-276-grouped rendering: group order comes from the pure core.
  const linesByGroup = new Map<string | null, CostEstimateLinePdf[]>();
  for (const line of data.lines) {
    const key = line.din276Group && line.din276Group.trim() !== '' ? line.din276Group : null;
    const list = linesByGroup.get(key) ?? [];
    list.push(line);
    linesByGroup.set(key, list);
  }

  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · Kostenschätzung (DIN 276) · ${estimate.title}`}
      author={data.letterhead?.orgName ?? 'EKOWAI Wizard'}
      subject={`Kostenschätzung (DIN 276) ${estimate.title}`}
    >
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <Text style={styles.h1}>Kostenschätzung (DIN 276)</Text>
        <Text style={styles.smallCaps}>{estimate.title}</Text>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.note}>
            {`Projekt: ${data.project.name}${data.project.projectCode ? ` (${data.project.projectCode})` : ''}`}
          </Text>
          {data.project.clientName ? (
            <Text style={styles.note}>{`Auftraggeber: ${data.project.clientName}`}</Text>
          ) : null}
          {data.project.location ? (
            <Text style={styles.note}>{`Standort: ${data.project.location}`}</Text>
          ) : null}
          {estimate.standardCode ? (
            <Text style={styles.note}>{`Regelwerk: ${estimate.standardCode}`}</Text>
          ) : null}
        </View>

        {/* Accuracy-class boundary — the liability line, always printed. */}
        <View
          style={{
            marginTop: 10,
            padding: 8,
            borderWidth: 0.75,
            borderColor: colors.hairline,
            backgroundColor: colors.paperAlt,
          }}
        >
          <Text style={{ fontSize: 8.5, color: colors.ink2 }}>
            {SCHAETZUNG_BOUNDARY_SENTENCE}
          </Text>
        </View>

        {/* Honesty banner: contingency below minimum or stale price basis. */}
        {data.showWarningBanner ? (
          <View
            style={{
              marginTop: 8,
              padding: 8,
              borderWidth: 0.75,
              borderColor: colors.errorBorder,
              backgroundColor: colors.errorBg,
            }}
          >
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: colors.error }}>
              Hinweis zur Belastbarkeit dieser Schätzung
            </Text>
            {totals.warnings.map((w, i) => (
              <Text key={`t${i}`} style={{ fontSize: 8.5, color: colors.error, marginTop: 2 }}>
                {`· ${w}`}
              </Text>
            ))}
            {data.staleWarnings.map((w, i) => (
              <Text key={`s${i}`} style={{ fontSize: 8.5, color: colors.error, marginTop: 2 }}>
                {`· ${w.message}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Column headers */}
        <View style={[styles.fieldRow, { marginTop: 12, borderBottomWidth: 0.5 }]}>
          <Text style={[COL.position, styles.projectMetaLabel]}>Position</Text>
          <Text style={[COL.qty, styles.projectMetaLabel]}>Menge</Text>
          <Text style={[COL.price, styles.projectMetaLabel]}>niedrig</Text>
          <Text style={[COL.price, styles.projectMetaLabel]}>wahrsch.</Text>
          <Text style={[COL.price, styles.projectMetaLabel]}>hoch</Text>
        </View>

        {data.lines.length === 0 ? (
          <Text style={styles.note}>Keine Positionen erfasst.</Text>
        ) : (
          totals.groups.map((g) => (
            <View key={g.din276Group ?? '_none'}>
              <View style={styles.worksheetHeader}>
                <Text style={styles.h3}>
                  {g.din276Group
                    ? `DIN 276 — Kostengruppe ${g.din276Group}`
                    : 'Ohne KG-Zuordnung'}
                </Text>
              </View>
              {(linesByGroup.get(g.din276Group) ?? []).map((line, i) => (
                <LineRow key={i} line={line} />
              ))}
              <View style={[styles.fieldRow, { borderBottomWidth: 0.5 }]}>
                <Text style={[COL.position, { fontSize: 8.5, fontFamily: 'Helvetica-Bold' }]}>
                  {`Zwischensumme ${g.din276Group ?? 'ohne KG'}`}
                </Text>
                <Text style={COL.qty} />
                <RangeCells r={g.subtotal} />
              </View>
            </View>
          ))
        )}

        {/* Totals: subtotal → contingency → grand total RANGE. */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.fieldRow}>
            <Text style={[COL.position, { fontSize: 9.5 }]}>Summe Positionen</Text>
            <Text style={COL.qty} />
            <RangeCells r={totals.subtotal} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={[COL.position, { fontSize: 9.5 }]}>
              {`Unvorhergesehenes (${fmtPct(estimate.contingencyPct)} %)`}
            </Text>
            <Text style={COL.qty} />
            <RangeCells r={totals.contingency} />
          </View>
          <View style={[styles.fieldRow, { borderBottomWidth: 0.75 }]}>
            <Text style={[COL.position, { fontSize: 10.5, fontFamily: 'Helvetica-Bold' }]}>
              Gesamt (Spanne, netto)
            </Text>
            <Text style={COL.qty} />
            <RangeCells r={totals.grandTotal} />
          </View>
          <Text style={styles.noteSubtle}>
            {`Erwartungswert: ${fmtEur(totals.grandTotal.likely)} · Spanne ${fmtEur(totals.grandTotal.low)} – ${fmtEur(totals.grandTotal.high)} · zzgl. gesetzlicher Umsatzsteuer`}
          </Text>
        </View>

        {/* Preisbasis + version lock */}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.h3}>Preisbasis und Berechnungsstand</Text>
          <Text style={styles.noteSubtle}>
            {data.priceBasisDates.length > 0
              ? `Preisbasis (Katalogstände): ${data.priceBasisDates.map(fmtDate).join(', ')}`
              : 'Preisbasis: keine Katalogpreise verknüpft — alle Preise manuell erfasst.'}
          </Text>
          <Text style={styles.noteSubtle}>
            {estimate.snapshotId
              ? `Mengen versionsgebunden an freigegebenen Berechnungsstand (Snapshot ${estimate.snapshotId}).`
              : 'Kein freigegebener Berechnungsstand verknüpft — Mengen sind Arbeitsstand.'}
          </Text>
          <Text style={styles.noteSubtle}>
            {`Erstellt am ${fmtDate(estimate.createdAt)} · Status: ${estimate.status}`}
          </Text>
        </View>

        <ReportFooter
          projectCode={data.project.projectCode}
          standardCode="KOSTENSCHÄTZUNG"
          generatedAt={data.generatedAt}
        />
      </Page>
    </Document>
  );
}
