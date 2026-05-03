import { Page, View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import type { projectDocuments } from '@/lib/db/schema';

type Doc = typeof projectDocuments.$inferSelect;

export function AppendixDivider({
  doc,
  letter,
}: {
  doc: Doc;
  letter: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={{ marginTop: 200 }}>
        <Text style={[styles.meta, { color: colors.accent }]}>
          Anhang {letter}
        </Text>
        <Text style={[styles.h1, { marginTop: 8 }]}>{doc.title}</Text>
        <Text style={{ marginTop: 4, color: colors.subtext }}>
          {doc.citationLabel}
        </Text>
        <View style={{ marginTop: 24 }}>
          <Text style={styles.meta}>SHA-256</Text>
          <Text style={styles.num}>{doc.sha256}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.meta}>Dateigröße</Text>
          <Text style={styles.num}>
            {(Number(doc.fileSize) / 1024).toFixed(0)} KB
          </Text>
        </View>
      </View>
    </Page>
  );
}
