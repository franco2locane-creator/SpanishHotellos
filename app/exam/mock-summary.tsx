import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useMockExamStore, type AssignmentResult } from '@/stores/mockExamStore';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { FixItem } from '@/lib/api/grade';

const PASS_MARK = 60;
const GATE_FAIL_SCORE = 10;

const TYPE_LABELS: Record<string, string> = {
  personal_presentation: 'Presentación personal',
  checkin: 'Check-in',
  restaurant: 'Restaurante',
  hotel_presentation: 'Presentación del hotel',
  job_interview: 'Entrevista de trabajo',
  complaint: 'Gestión de queja',
  saying_no: 'Denegación educada',
};

const CRITERIA: { key: 'fluency' | 'vocabulary' | 'grammar' | 'pronunciation' | 'content'; label: string }[] = [
  { key: 'fluency', label: 'Fluency' },
  { key: 'vocabulary', label: 'Vocab' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'pronunciation', label: 'Pron.' },
  { key: 'content', label: 'Content' },
];

// ── Per-assignment detail card ─────────────────────────────────────────────────

function AssignmentCard({ index, result, expected }: { index: number; result: AssignmentResult | null; expected: string }) {
  const [open, setOpen] = useState(false);

  if (!result) {
    return (
      <View style={[styles.assignmentRow, styles.assignmentRowMissing]}>
        <Text style={styles.assignmentLabel}>{TYPE_LABELS[expected] ?? expected}</Text>
        <Text style={styles.notGradedText}>Not graded — try it again from your history</Text>
      </View>
    );
  }

  const score100 = Math.round(result.score * 5);
  const assignmentPassed = score100 >= PASS_MARK;
  const gate = result.gradeResult.hospitalityGate;
  const hitCount = result.checklistHit.length;
  const totalCount = result.checklistTotal.length;

  return (
    <TouchableOpacity style={styles.assignmentRow} onPress={() => setOpen(o => !o)} activeOpacity={0.85}>
      <View style={styles.assignmentTop}>
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentLabel}>{TYPE_LABELS[result.assignmentType] ?? result.assignmentType}</Text>
          {totalCount > 0 && (
            <Text style={styles.checklistSummary}>Checklist: {hitCount}/{totalCount} steps hit</Text>
          )}
          {gate.applicable && !gate.passed && (
            <Text style={styles.gateFailTag}>⚠ Register gate failed</Text>
          )}
        </View>
        <View style={styles.assignmentScore}>
          <Text style={[styles.assignmentScoreNum, assignmentPassed ? styles.scoreGreen : styles.scoreRed]}>{score100}</Text>
          <Text style={styles.assignmentScoreDen}>/100</Text>
        </View>
      </View>

      {open && (
        <View style={styles.assignmentDetail}>
          {result.gradeResult.feedback ? (
            <Text style={styles.feedbackText}>{result.gradeResult.feedback}</Text>
          ) : null}

          {CRITERIA.map(c => {
            const d = result.gradeResult.detail[c.key];
            return (
              <View key={c.key} style={styles.critRow}>
                <Text style={styles.critLabel}>{c.label}</Text>
                <View style={styles.critBarBg}>
                  <View style={[styles.critBarFill, { width: `${(d.score / 20) * 100}%` }]} />
                </View>
                <Text style={styles.critScore}>{d.score}/20</Text>
              </View>
            );
          })}

          {result.gradeResult.detail.content.examples.length > 0 && (
            <View style={styles.examplesBlock}>
              {result.gradeResult.detail.content.examples.slice(0, 2).map((ex, i) => (
                <Text key={i} style={styles.example}>"{ex}"</Text>
              ))}
            </View>
          )}

          {totalCount > 0 && (
            <View style={styles.checklistBlock}>
              {result.checklistTotal.map(item => {
                const hit = result.checklistHit.includes(item.id);
                return (
                  <Text key={item.id} style={[styles.checklistItem, hit ? styles.checklistHit : styles.checklistMiss]}>
                    {hit ? '✓' : '✗'} {item.label}
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MockSummary() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { exam, results, reset } = useMockExamStore();
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving');

  const validResults = results.filter((r): r is AssignmentResult => r !== null);
  const missingCount = results.length - validResults.length;

  // Hospitality gate applies to hospitality assignments only — personal_presentation
  // is never applicable (tú is correct there). Any applicable failure fails the whole mock.
  const applicableGates = validResults
    .map(r => r.gradeResult.hospitalityGate)
    .filter(g => g.applicable);
  const gatePassed = applicableGates.every(g => g.passed);
  const gateEvaluated = applicableGates.length > 0;
  const gateOverrideApplied = gateEvaluated && !gatePassed;

  const rawAvg = validResults.length
    ? validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length
    : 0;
  const rawOut100 = Math.round(rawAvg * 5);
  const totalOut100 = gateOverrideApplied ? GATE_FAIL_SCORE : rawOut100;
  const passed = totalOut100 >= PASS_MARK;

  // Aggregate topThingsFix from all assignments — rank by frequency across results
  const fixCounts: Record<string, { item: FixItem; count: number }> = {};
  for (const r of validResults) {
    for (const f of r.gradeResult.topThingsFix ?? []) {
      if (fixCounts[f.drillType]) fixCounts[f.drillType].count++;
      else fixCounts[f.drillType] = { item: f, count: 1 };
    }
  }
  const topFixes = Object.values(fixCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ item }) => item);

  // ── Persist the combined result once ─────────────────────────────────────────

  useEffect(() => {
    if (!user || !exam) { setSaveState('error'); return; }
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist() {
    if (!user || !exam) return;
    setSaveState('saving');
    try {
      const assignmentResults = results.map((r, i) => r ? {
        assignmentType: r.assignmentType,
        score: Math.round(r.score * 5),
        checklistHit: r.checklistHit,
        checklistTotal: r.checklistTotal,
        gatePassed: r.gradeResult.hospitalityGate.applicable ? r.gradeResult.hospitalityGate.passed : null,
      } : {
        assignmentType: exam.assignments[i]?.type ?? 'unknown',
        score: null, checklistHit: [], checklistTotal: [], gatePassed: null,
      });

      const { error } = await supabase.from('mock_attempts').insert({
        user_id: user.id,
        mock_id: exam.id,
        level: exam.level,
        combined_score: totalOut100,
        passed,
        gate_passed: gatePassed,
        assignment_results: assignmentResults,
      });
      if (error) throw error;
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function handleDone() {
    reset();
    router.replace('/(tabs)/mock-exam' as any);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Exam Complete</Text>
        <Text style={styles.sub}>{exam?.id ?? ''}</Text>

        {missingCount > 0 && (
          <View style={styles.missingBanner}>
            <Text style={styles.missingBannerText}>
              {missingCount} assignment{missingCount > 1 ? 's' : ''} couldn't be graded and {missingCount > 1 ? "aren't" : "isn't"} included in your score below.
            </Text>
          </View>
        )}

        {gateOverrideApplied && (
          <View style={styles.gateFailBanner}>
            <Text style={styles.gateFailTitle}>⚠ Hospitality register gate failed</Text>
            <Text style={styles.gateFailText}>
              Formal register (usted) is required throughout hospitality assignments. Your score is
              capped at {GATE_FAIL_SCORE}/100 regardless of your other scores — exactly like the real exam.
            </Text>
          </View>
        )}

        {/* Overall score */}
        <View style={[styles.scoreCard, passed ? styles.scoreCardPass : styles.scoreCardFail]}>
          <Text style={styles.scoreNum}>{totalOut100}</Text>
          <Text style={styles.scoreOf}>/ 100</Text>
          <View style={[styles.badge, passed ? styles.badgePass : styles.badgeFail]}>
            <Text style={styles.badgeText}>{passed ? 'PASS' : 'FAIL'}</Text>
          </View>
          <Text style={styles.passNote}>Pass mark: {PASS_MARK}/100</Text>
        </View>

        {saveState === 'error' && (
          <View style={styles.saveErrorBanner}>
            <Text style={styles.saveErrorText}>Couldn't save this result to your history.</Text>
            <TouchableOpacity onPress={persist} style={styles.saveRetryBtn}>
              <Text style={styles.saveRetryText}>Retry save</Text>
            </TouchableOpacity>
          </View>
        )}
        {saveState === 'saving' && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={Colors.textMuted} />
            <Text style={styles.savingText}>Saving to your progress history…</Text>
          </View>
        )}

        {/* Per-assignment breakdown */}
        <Text style={styles.sectionTitle}>Assignment breakdown</Text>
        {results.map((r, i) => (
          <AssignmentCard key={i} index={i} result={r} expected={exam?.assignments[i]?.type ?? 'unknown'} />
        ))}

        {/* Top fixes — aggregated across all assignments by frequency */}
        {topFixes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>What to drill before your next mock</Text>
            <View style={styles.fixCard}>
              {topFixes.map((f, i) => (
                <View key={f.drillType} style={styles.fixRow}>
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
  missingBanner: { backgroundColor: '#FFF8EC', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md },
  missingBannerText: { fontSize: Typography.caption, color: Colors.gold, lineHeight: 18 },
  gateFailBanner: { backgroundColor: '#FEF2F2', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.error },
  gateFailTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.error, marginBottom: 4 },
  gateFailText: { fontSize: Typography.caption, color: '#991B1B', lineHeight: 18 },
  scoreCard: {
    borderRadius: Radii.xl, padding: Spacing.xl, alignItems: 'center',
    marginBottom: Spacing.md, ...Shadows.md,
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
  saveErrorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEE2E2', borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  saveErrorText: { flex: 1, fontSize: Typography.caption, color: Colors.error },
  saveRetryBtn: { backgroundColor: Colors.error, borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  saveRetryText: { color: '#fff', fontSize: Typography.caption, fontWeight: Typography.semibold },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  savingText: { fontSize: Typography.caption, color: Colors.textMuted },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  assignmentRow: {
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  assignmentRowMissing: { opacity: 0.7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignmentTop: { flexDirection: 'row', gap: Spacing.md },
  assignmentInfo: { flex: 1, gap: 2 },
  assignmentLabel: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
  checklistSummary: { fontSize: Typography.caption, color: Colors.textMuted },
  gateFailTag: { fontSize: Typography.caption, color: Colors.error, fontWeight: Typography.semibold },
  notGradedText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  feedbackText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  assignmentScore: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 56 },
  assignmentScoreNum: { fontSize: Typography.heading, fontWeight: Typography.bold },
  assignmentScoreDen: { fontSize: Typography.caption, color: Colors.textMuted },
  scoreGreen: { color: '#2D7A4F' },
  scoreRed: { color: Colors.error },
  assignmentDetail: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#EDE9E3', gap: Spacing.xs },
  critRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  critLabel: { width: 56, fontSize: Typography.caption, color: Colors.textSecondary },
  critBarBg: { flex: 1, height: 6, backgroundColor: '#EDE9E3', borderRadius: 3, overflow: 'hidden' },
  critBarFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  critScore: { width: 36, fontSize: Typography.caption, fontWeight: Typography.semibold, color: Colors.navy, textAlign: 'right' },
  examplesBlock: { gap: 4, marginTop: 4 },
  example: {
    fontSize: Typography.caption, color: Colors.navy, fontStyle: 'italic',
    backgroundColor: '#EEF3F9', borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  checklistBlock: { marginTop: 4, gap: 2 },
  checklistItem: { fontSize: Typography.caption, lineHeight: 18 },
  checklistHit: { color: '#16A34A' },
  checklistMiss: { color: Colors.textMuted },
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
