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
    fontFamily: 'Inter',
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
    fontFamily: 'JetBrainsMono',
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
    fontFamily: 'JetBrainsMono',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  cellSym: {
    width: 70,
    fontFamily: 'JetBrainsMono',
    fontSize: 9,
  },
  cellDesc: {
    flex: 1,
  },
  cellVal: {
    width: 80,
    fontFamily: 'JetBrainsMono',
    textAlign: 'right',
  },
  cellUnit: {
    width: 40,
    fontFamily: 'JetBrainsMono',
    color: colors.subtext,
  },
  cellSrc: {
    width: 80,
    fontFamily: 'JetBrainsMono',
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
});
