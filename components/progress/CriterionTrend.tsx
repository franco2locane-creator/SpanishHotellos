import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const SPARK_W = 64;
const SPARK_H = 28;

export type CriterionKey = 'fluency' | 'vocabulary' | 'grammar' | 'pronunciation' | 'content';

const CRITERIA: { key: CriterionKey; label: string }[] = [
  { key: 'fluency', label: 'Fluency' },
  { key: 'vocabulary', label: 'Vocab' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'pronunciation', label: 'Pron.' },
  { key: 'content', label: 'Content' },
];

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <View style={{ width: SPARK_W, height: SPARK_H }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * SPARK_W;
    const y = SPARK_H - ((v - min) / (max - min)) * (SPARK_H - 6) - 3;
    return { x, y };
  });
  const last = pts[pts.length - 1];
  const rising = values[values.length - 1] >= values[0];

  return (
    <Svg width={SPARK_W} height={SPARK_H}>
      <Polyline
        points={pts.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={rising ? '#16A34A' : Colors.gold}
        strokeWidth={2}
      />
      <Circle cx={last.x} cy={last.y} r={2.5} fill={rising ? '#16A34A' : Colors.gold} />
    </Svg>
  );
}

type Props = {
  /** Ordered oldest -> newest, one entry per attempt, each a full criterion score map. */
  series: Record<CriterionKey, number>[];
};

export default function CriterionTrend({ series }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Per-Criterion Trend</Text>
      {series.length < 2 ? (
        <Text style={styles.emptyText}>Complete 2 or more graded sessions to see trends.</Text>
      ) : (
        <View style={styles.grid}>
          {CRITERIA.map(c => (
            <View key={c.key} style={styles.cell}>
              <Text style={styles.cellLabel}>{c.label}</Text>
              <Sparkline values={series.map(s => s[c.key])} />
              <Text style={styles.cellVal}>{series[series.length - 1][c.key]}/20</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  emptyText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  cell: { alignItems: 'center', width: '19%', gap: 2 },
  cellLabel: { fontSize: 10, color: Colors.textMuted },
  cellVal: { fontSize: 11, fontWeight: Typography.semibold, color: Colors.navy },
});
