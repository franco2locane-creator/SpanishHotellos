import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMockExamStore } from '@/stores/mockExamStore';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const PASS_MARK = 60;

const TYPE_LABELS: Record<string, string> = {
  personal_presentation: 'Presentación personal',
  checkin: 'Check-in',
  restaurant: 'Restaurante',
  hotel_presentation: 'Presentación del hotel',
  job_interview: 'Entrevista de trabajo',
  complaint: 'Gestión de queja',
  saying_no: 'Denegación educada',
};

export default function MockSummary() {
  const router = useRouter();
  const { exam, results, reset } = useMockExamStore();

  const validResults = results.filter(Boolean);
  const totalScoreRaw = validResults.length
    ? validResults.reduce((sum, r) => sum + (r?.score ?? 0), 0) / validResults.length
    : 0;
  const totalOut100 = Math.round(totalScoreRaw * 5);
  const passed = totalOut100 >= PASS_MARK;

  function handleDone() {
    reset();
    router.replace('/(tabs)/mock-exam' as any);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Exam Complete</Text>
        <Text style={styles.sub}>{exam?.id ?? ''}</Text>

        {/* Overall score */}
        <View style={[styles.scoreCard, passed ? styles.scoreCardPass : styles.scoreCardFail]}>
          <Text style={styles.scoreNum}>{totalOut100}</Text>
          <Text style={styles.scoreOf}>/ 100</Text>
          <View style={[styles.badge, passed ? styles.badgePass : styles.badgeFail]}>
            <Text style={styles.badgeText}>{passed ? 'PASS' : 'FAIL'}</Text>
          </View>
          <Text style={styles.passNote}>Pass mark: {PASS_MARK}/100</Text>
        </View>

        {/* Per-assignment breakdown */}
        <Text style={styles.sectionTitle}>Assignment breakdown</Text>
        {results.map((r, i) => {
          const score100 = r ? Math.round(r.score * 5) : null;
          const label = r ? TYPE_LABELS[r.assignmentType] ?? r.assignmentType : `Assignment ${i + 1}`;
          const assignmentPassed = score100 !== null && score100 >= PASS_MARK;

          return (
            <View key={i} style={styles.assignmentRow}>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentLabel}>{label}</Text>
                {r?.gradeResult.feedback ? (
                  <Text style={styles.feedbackText} numberOfLines={3}>
                    {r.gradeResult.feedback}
                  </Text>
                ) : null}
              </View>
              <View style={styles.assignmentScore}>
                {score100 !== null ? (
                  <>
                    <Text style={[styles.assignmentScoreNum, assignmentPassed ? styles.scoreGreen : styles.scoreRed]}>
                      {score100}
                    </Text>
                    <Text style={styles.assignmentScoreDen}>/100</Text>
                  </>
                ) : (
                  <Text style={styles.noScore}>—</Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Criteria detail for first result with data */}
        {validResults[0]?.gradeResult && (
          <>
            <Text style={styles.sectionTitle}>Top things to improve</Text>
            <View style={styles.fixCard}>
              {validResults[0].gradeResult.topThingsFix.map((f, i) => (
                <View key={i} style={styles.fixRow}>
                  <Text style={styles.fixNum}>{i + 1}</Text>
                  <Text style={styles.fixLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Back to Mock Exams</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 80 },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy, marginBottom: 4 },
  sub: { fontSize: Typography.caption, color: Colors.textMuted, marginBottom: Spacing.lg },
  scoreCard: {
    borderRadius: Radii.xl, padding: Spacing.xl, alignItems: 'center',
    marginBottom: Spacing.lg, ...Shadows.md,
  },
  scoreCardPass: { backgroundColor: '#E6F4EA' },
  scoreCardFail: { backgroundColor: '#FDECEA' },
  scoreNum: { fontSize: 80, fontWeight: Typography.bold, color: Colors.navy, lineHeight: 88 },
  scoreOf: { fontSize: Typography.heading, color: Colors.textSecondary, marginBottom: Spacing.sm },
  badge: { borderRadius: Radii.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, marginBottom: Spacing.sm },
  badgePass: { backgroundColor: '#2D7A4F' },
  badgeFail: { backgroundColor: Colors.error },
  badgeText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body, letterSpacing: 2 },
  passNote: { fontSize: Typography.caption, color: Colors.textMuted },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  assignmentRow: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radii.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm, gap: Spacing.md,
  },
  assignmentInfo: { flex: 1 },
  assignmentLabel: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy, marginBottom: 4 },
  feedbackText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  assignmentScore: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 56 },
  assignmentScoreNum: { fontSize: Typography.heading, fontWeight: Typography.bold },
  assignmentScoreDen: { fontSize: Typography.caption, color: Colors.textMuted },
  scoreGreen: { color: '#2D7A4F' },
  scoreRed: { color: Colors.error },
  noScore: { fontSize: Typography.body, color: Colors.textMuted },
  fixCard: { backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.lg, ...Shadows.sm, gap: Spacing.sm },
  fixRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  fixNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.navy,
    color: '#fff', textAlign: 'center', lineHeight: 24, fontSize: Typography.caption, fontWeight: Typography.bold,
  },
  fixLabel: { flex: 1, fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 22 },
  doneBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  doneBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
});
