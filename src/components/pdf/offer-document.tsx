import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { LetterheadHeader } from './letterhead-header';
import { ReportFooter } from './footer';
import type { OfferPdfData } from '@/lib/pdf/build-offer';

/**
 * Angebot — the CLIENT document (Slice E1).
 *
 * Shows positions (Position + Beschreibung only) and the Festpreis TOTAL.
 * NO margin data ever: no hours, no internal rate, no external-cost split —
 * `OfferPdfData` does not even carry those fields (see build-offer.tsx).
 */

function fmtEur(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return `${v} €`;
  return `${n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

export function OfferDocument({ data }: { data: OfferPdfData }) {
  return (
    <Document
      title={`${data.project.projectCode ?? 'Projekt'} · Angebot · ${data.offer.title}`}
      author={data.letterhead?.orgName ?? 'EKOWAI Wizard'}
      subject={`Angebot ${data.offer.title}`}
    >
      <Page size="A4" style={styles.page}>
        <LetterheadHeader letterhead={data.letterhead} />
        <Text style={styles.h1}>Angebot</Text>
        <Text style={styles.smallCaps}>{data.offer.title}</Text>

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
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={styles.h2}>Leistungen</Text>
          {data.positions.length === 0 ? (
            <Text style={styles.note}>Keine Positionen erfasst.</Text>
          ) : (
            data.positions.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
                <Text style={{ width: 24 }}>{`${i + 1}.`}</Text>
                <View style={{ flex: 1 }}>
                  <Text>{p.position}</Text>
                  {p.note ? <Text style={styles.note}>{p.note}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.hairline} />

        <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Festpreis (netto)</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
            {fmtEur(data.offer.festpreisEur)}
          </Text>
        </View>
        <Text style={styles.note}>zzgl. gesetzlicher Umsatzsteuer</Text>

        <View style={{ marginTop: 14 }}>
          {data.offer.bearbeitungszeit ? (
            <Text>
              {`Bearbeitungszeit ab vollständigen Unterlagen: ${data.offer.bearbeitungszeit}`}
            </Text>
          ) : null}
          {data.offer.validUntil ? (
            <Text>{`Dieses Angebot ist gültig bis ${fmtDate(data.offer.validUntil)}.`}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <View style={styles.hairline} />
            <Text style={styles.note}>Ort, Datum</Text>
          </View>
          <View style={{ width: '45%' }}>
            <View style={styles.hairline} />
            <Text style={styles.note}>Unterschrift Auftraggeber</Text>
          </View>
        </View>

        <ReportFooter
          projectCode={data.project.projectCode}
          standardCode="ANGEBOT"
          generatedAt={data.generatedAt}
        />
      </Page>
    </Document>
  );
}
