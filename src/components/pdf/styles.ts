import { StyleSheet } from '@react-pdf/renderer';

/**
 * @react-pdf/renderer styles — STRICTLY limited to what the PDF spec built-in
 * fonts (Helvetica, Courier) can render. We deliberately do NOT register any
 * external fonts here — see src/lib/pdf/fonts.ts for the rationale.
 *
 * Constraints we hit and worked around (don't reintroduce them):
 *
 *   - No CSS Grid / no flex `gap` on @react-pdf < 4 (we're on 4.x so `gap`
 *     works, but only on flex containers — not block).
 *   - No `lineHeight` on Text shorthand — set on the parent View.
 *   - No background-image; the watermark / engine-warning frames are styled
 *     with View + borderColor.
 *   - rgba() works only as a fully-resolved color string ('#xxxxxx' or named).
 *
 * Colors mirror the in-app palette so the PDF matches what the engineer sees
 * on screen.
 */
export const colors = {
  ink: '#0d1418',
  ink2: '#2a3338',
  subtext: '#5f6a72',
  paper: '#f8f5ee',
  paperAlt: '#efeadd',
  hairline: '#b8b1a2',
  accent: '#2f6f63',
  // Engine three-state colors — match equation-engine-card.tsx.
  success: '#2d5f4d',
  successBg: '#e3efe9',
  successBorder: '#a9c5b8',
  warning: '#8a5a2b',
  error: '#7c2d2d',
  errorBg: '#f5e6e6',
  errorBorder: '#d4a5a5',
};

export const styles = StyleSheet.create({
  // ============ Page ============
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    paddingTop: 84,
    paddingBottom: 56,
    paddingHorizontal: 48,
    lineHeight: 1.4,
  },
  // ============ Typography ============
  h1: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink,
    marginBottom: 4,
  },
  h2: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink2,
    marginTop: 10,
    marginBottom: 4,
  },
  smallCaps: {
    fontSize: 8,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  hairline: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
    marginTop: 4,
    marginBottom: 6,
  },
  mono: {
    fontFamily: 'Courier',
  },
  // ============ Letterhead ============
  letterhead: {
    position: 'absolute',
    top: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
    paddingBottom: 6,
  },
  letterheadLeft: {
    flexDirection: 'column',
    maxWidth: 320,
  },
  letterheadOrg: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink,
  },
  letterheadAddr: {
    fontSize: 8,
    color: colors.subtext,
    lineHeight: 1.3,
  },
  letterheadRight: {
    textAlign: 'right',
    fontSize: 8,
    color: colors.subtext,
  },
  letterheadLogo: {
    maxWidth: 80,
    maxHeight: 32,
  },
  // ============ Project header ============
  projectHeader: {
    marginTop: 6,
    marginBottom: 14,
  },
  projectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  projectMetaCell: {
    width: '50%',
    marginBottom: 4,
  },
  projectMetaLabel: {
    fontSize: 7.5,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  projectMetaValue: {
    fontSize: 10,
    color: colors.ink,
  },
  statusBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    padding: 3,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  // ============ Field table ============
  fieldRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.hairline,
  },
  fieldRowSymbol: {
    width: 70,
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.ink2,
  },
  fieldRowLabel: {
    flex: 1,
    fontSize: 9,
    color: colors.ink,
    paddingRight: 6,
  },
  fieldRowValue: {
    width: 90,
    fontFamily: 'Courier',
    fontSize: 9,
    textAlign: 'right',
    color: colors.ink,
  },
  fieldRowUnit: {
    width: 40,
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.subtext,
    paddingLeft: 4,
  },
  fieldRowCitations: {
    width: 100,
    fontFamily: 'Courier',
    fontSize: 7.5,
    color: colors.accent,
    textAlign: 'right',
  },
  fieldMissing: {
    fontStyle: 'italic',
    color: colors.subtext,
  },
  // ============ Engine verdict (THE three-state output) ============
  engineCard: {
    marginVertical: 6,
    padding: 8,
    borderWidth: 0.75,
    borderRadius: 2,
  },
  engineCardOk: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successBg,
  },
  // manual_required and error use the SAME prominent treatment — both surface
  // as a red-bordered box. This is deliberate: the engineer must not be able
  // to confuse "engine couldn't verify" with "value confirmed by engine".
  engineCardWarn: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
  },
  engineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  engineEqLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: colors.ink,
  },
  engineVerdictOk: {
    fontSize: 8,
    color: colors.success,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  engineVerdictWarn: {
    fontSize: 8,
    color: colors.error,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  engineFormula: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.ink2,
    marginVertical: 2,
  },
  engineResult: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink,
    marginTop: 3,
  },
  engineReason: {
    fontSize: 9,
    color: colors.error,
    marginTop: 3,
  },
  engineSubsRow: {
    flexDirection: 'row',
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.ink2,
  },
  // ============ Compliance ============
  complianceRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.hairline,
  },
  complianceCode: {
    width: 60,
    fontFamily: 'Courier',
    fontSize: 8.5,
  },
  complianceTitle: {
    flex: 1,
    fontSize: 9,
  },
  complianceBadge: {
    width: 80,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  complianceBadgePass: { color: colors.success },
  complianceBadgeFail: { color: colors.error },
  complianceBadgeOpen: { color: colors.warning },
  // ============ Site profile ============
  siteRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  siteLabel: {
    width: 160,
    fontSize: 9,
    color: colors.subtext,
  },
  siteValue: {
    flex: 1,
    fontSize: 9.5,
    color: colors.ink,
  },
  // ============ Citation index ============
  citationIndexRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.hairline,
  },
  citationLabelCell: {
    width: 80,
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.accent,
  },
  citationTitleCell: {
    flex: 1,
    fontSize: 9,
  },
  citationKindCell: {
    width: 100,
    fontSize: 8.5,
    color: colors.subtext,
  },
  citationDateCell: {
    width: 70,
    fontSize: 8.5,
    color: colors.subtext,
    textAlign: 'right',
  },
  // ============ Audit excerpt ============
  auditRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.hairline,
  },
  auditDate: {
    width: 100,
    fontFamily: 'Courier',
    fontSize: 8,
    color: colors.subtext,
  },
  auditAction: {
    width: 100,
    fontSize: 8.5,
    color: colors.ink2,
  },
  auditActor: {
    width: 80,
    fontSize: 8.5,
    color: colors.ink2,
  },
  auditDetail: {
    flex: 1,
    fontSize: 8.5,
    color: colors.ink,
  },
  // ============ Footer ============
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: colors.subtext,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline,
    paddingTop: 6,
  },
  // ============ Misc ============
  note: {
    fontSize: 9,
    fontStyle: 'italic',
    color: colors.subtext,
    marginTop: 3,
  },
  noteSubtle: {
    fontSize: 8.5,
    color: colors.subtext,
    marginTop: 2,
  },
  worksheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  worksheetCode: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: colors.subtext,
  },
});
