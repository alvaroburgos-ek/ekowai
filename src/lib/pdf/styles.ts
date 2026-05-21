import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  ink: '#0d1418',
  ink2: '#2a3338',
  subtext: '#5f6a72',
  paper: '#f8f5ee',
  hairline: '#b8b1a2',
  accent: '#2f6f63',
  warning: '#8a5a2b',
  error: '#7c2d2d',
  success: '#2d5f4d',
};

export const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 56,
    lineHeight: 1.4,
  },
  h1: {
    fontSize: 18,
    fontWeight: 'semibold',
    marginBottom: 4,
  },
  h2: {
    fontSize: 12,
    fontWeight: 'semibold',
    marginTop: 18,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  meta: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  rule: {
    borderBottomWidth: 0.5,
    borderColor: colors.hairline,
    marginVertical: 6,
  },
  num: {
    fontFamily: 'Courier',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  cellSym: {
    width: 70,
    fontFamily: 'Courier',
    fontSize: 9,
  },
  cellDesc: {
    flex: 1,
  },
  cellVal: {
    width: 80,
    fontFamily: 'Courier',
    textAlign: 'right',
  },
  cellUnit: {
    width: 40,
    fontFamily: 'Courier',
    color: colors.subtext,
  },
  cellSrc: {
    width: 80,
    fontFamily: 'Courier',
    fontSize: 8,
    color: colors.accent,
  },
  chipOk: {
    color: colors.success,
  },
  chipWarn: {
    color: colors.warning,
  },
  chipErr: {
    color: colors.error,
  },
  // Cover page styles
  coverPage: { padding: 48, height: '100%', justifyContent: 'center' as const },
  coverMeta: { fontSize: 10, letterSpacing: 2, color: '#666', marginBottom: 16 },
  coverTitle: { fontSize: 28, fontWeight: 'bold' as const, color: '#1a1a1a', marginBottom: 12 },
  coverSubtitle: { fontSize: 14, color: '#444', marginBottom: 24 },
  coverOrg: { fontSize: 12, color: '#666', marginBottom: 8 },
  coverDate: { fontSize: 10, color: '#888' },
  // Section layout
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold' as const, marginBottom: 12 },
  // Table cells (new names — existing cellSym/cellDesc/cellVal/cellUnit/cellSrc kept above)
  codeCell: { width: 80, fontSize: 9 },
  titleCell: { flex: 1, fontSize: 10 },
  versionCell: { width: 80, fontSize: 9, color: '#666' as const },
  symbolCell: { width: 80, fontSize: 9, fontFamily: 'Courier' },
  labelCell: { flex: 1, fontSize: 9 },
  valueCell: { width: 120, fontSize: 9, textAlign: 'right' as const },
  dateCell: { width: 100, fontSize: 8 },
  eventCell: { width: 160, fontSize: 8 },
  actorCell: { width: 80, fontSize: 8 },
  commentCell: { flex: 1, fontSize: 8, fontStyle: 'italic' as const },
  worksheetGroup: { marginBottom: 12 },
  worksheetTitle: { fontSize: 11, fontWeight: 'bold' as const, marginBottom: 4 },
  note: { fontSize: 9, fontStyle: 'italic' as const, color: '#666' as const },
  // Footer / watermark / appendix
  footer: {
    position: 'absolute' as const,
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    fontSize: 8,
    color: '#888',
  },
  watermark: {
    position: 'absolute' as const,
    top: 200,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    fontSize: 36,
    color: '#ccc',
    transform: 'rotate(-30deg)',
  },
  appendixDivider: { padding: 48, height: '100%', justifyContent: 'center' as const },
  appendixTitle: { fontSize: 24, fontWeight: 'bold' as const },
});
