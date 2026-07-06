import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { CriterionDetail, RegisterDetail } from '@/lib/api/grade';

type Props = {
  label: string;
  icon: string;
  detail: CriterionDetail | RegisterDetail;
  color: string;
};

function scoreColor(score: number): string {
  if (score >= 16) return '#16A34A';
  if (score >= 11) return '#CA8A04';
  return '#DC2626';
}

export default function CriterionCard({ label, icon, detail, color }: Props) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((detail.score / 20) * 100);
  const tuForms = (detail as RegisterDetail).tuForms;

  return (
    <TouchableOpacity style={styles.card} onPress={() => setOpen(o => !o)} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: scoreColor(detail.score) }]} />
          </View>
        </View>
        <Text style={[styles.score, { color: scoreColor(detail.score) }]}>{detail.score}/20</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </View>

      {open && (
        <View style={styles.body}>
          <Text style={styles.note}>{detail.note}</Text>

          {detail.examples.length > 0 && (
            <View style={styles.examplesBlock}>
              {detail.examples.map((ex, i) => (
                <Text key={i} style={styles.example}>"{ex}"</Text>
              ))}
            </View>
          )}

          {tuForms && tuForms.length > 0 && (
            <View style={styles.tuBlock}>
              <Text style={styles.tuTitle}>Tú-forms detected ({tuForms.length}):</Text>
              {tuForms.map((f, i) => (
                <Text key={i} style={styles.tuItem}>• {f}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
  label: { fontSize: Typography.caption, fontWeight: Typography.semibold, color: Colors.navy, marginBottom: 4 },
  barBg: { height: 6, backgroundColor: '#EDE9E3', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  score: { fontSize: Typography.body, fontWeight: Typography.bold, minWidth: 38, textAlign: 'right' },
  chevron: { fontSize: 10, color: Colors.textMuted, marginLeft: 2 },
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
  note: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  examplesBlock: { gap: 4 },
  example: {
    fontSize: Typography.caption, color: Colors.navy, fontStyle: 'italic',
    backgroundColor: '#EEF3F9', borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  tuBlock: {
    backgroundColor: '#FEF2F2', borderRadius: Radii.sm,
    padding: Spacing.sm, gap: 2,
  },
  tuTitle: { fontSize: Typography.caption, fontWeight: Typography.semibold, color: '#DC2626' },
  tuItem: { fontSize: Typography.caption, color: '#DC2626' },
});
