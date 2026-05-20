import { View, Text } from '@react-pdf/renderer';

export function Watermark() {
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: 280,
        left: 80,
        opacity: 0.08,
        transform: 'rotate(-30deg)',
      }}
    >
      <Text style={{ fontSize: 96, fontWeight: 'semibold', letterSpacing: 12 }}>
        VORSCHAU
      </Text>
    </View>
  );
}
