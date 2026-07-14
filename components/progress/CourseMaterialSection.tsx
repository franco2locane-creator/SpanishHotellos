import { Text, StyleSheet } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import LastMockCard from './LastMockCard';
import LockedOverlay from './LockedOverlay';
import WebUnavailableCard from './WebUnavailableCard';
import { ScenarioCoverageCard, VocabCoverageCard, GrammarCoverageCard, MockCoverageCard } from './CoverageCards';
import ScenarioActivityCard from './ScenarioActivityCard';
import MockHistoryList, { type MockAttemptRow } from './MockHistoryList';
import { Colors, Spacing, Typography } from '@/lib/theme';
import type { CoverageSummary, ScenarioActivity } from '@/lib/progressCoverage';
import type { ScenarioMeta } from '@/lib/scenarios/catalog';

const SAMPLE_MOCK_HISTORY: MockAttemptRow[] = [
  { id: 'sample-m1', mock_id: 'basic-2', combined_score: 62, passed: true, gate_passed: true, assignment_results: [], completed_at: '2026-05-05' },
  { id: 'sample-m2', mock_id: 'basic-3', combined_score: 71, passed: true, gate_passed: true, assignment_results: [], completed_at: '2026-05-12' },
];

type Props = {
  coverage: CoverageSummary;
  scenarioActivity: ScenarioActivity[];
  scenarios: ScenarioMeta[];
  onViewScenarioFeedback: (scenarioId: string) => void;
  vocabDueCount: number;
  lastMock: MockAttemptRow | null;
  mockAttempts: MockAttemptRow[];
  onViewMockFeedback: (mockId: string) => void;
  isFull: boolean;
  onUnlockPaywall: () => void;
  /** SQLite (vocab progress) no-ops on web by design — the Vocab row shows a
   *  "stats available in the mobile app" state instead of a false 0/0. */
  isWeb: boolean;
};

/**
 * "Course Material" (renamed from Coverage) — one outer collapsible holding
 * four nested collapsibles, each collapsed by default with a one-line
 * labeled summary and expanding to the same detail cards built in prior
 * passes. Every summary number below uses the SAME metric as its label and
 * denominator — no bare "x/y". Mock history keeps its existing LITE-locked
 * boundary (it lived in the old Performance section before this pass) —
 * everything else here was already free for both tiers.
 */
export default function CourseMaterialSection({
  coverage, scenarioActivity, scenarios, onViewScenarioFeedback,
  vocabDueCount, lastMock, mockAttempts, onViewMockFeedback, isFull, onUnlockPaywall, isWeb,
}: Props) {
  const scenariosCompleted = coverage.scenarios.reduce((s, c) => s + c.completed, 0);
  const scenariosTotal = coverage.scenarios.reduce((s, c) => s + c.total, 0);

  const onLevelVocab = coverage.vocab.filter(d => !d.offLevel);
  const cardsSeen = onLevelVocab.reduce((s, d) => s + d.seen, 0);
  const cardsTotal = onLevelVocab.reduce((s, d) => s + d.total, 0);
  const decksTouched = onLevelVocab.filter(d => d.seen > 0).length;

  const onLevelGrammar = coverage.grammar.filter(g => !g.offLevel);
  const grammarAttempted = onLevelGrammar.filter(g => g.attempted).length;

  return (
    <CollapsibleSection title="Course Material" storageKey="@sp4h_progress_section_coursematerial">
      <CollapsibleSection
        title="Scenarios"
        storageKey="@sp4h_progress_section_coursematerial_scenarios"
        summary={`${scenariosCompleted} of ${scenariosTotal} scenarios completed`}
      >
        <ScenarioCoverageCard coverage={coverage.scenarios} offLevelCompleted={coverage.offLevelScenariosCompleted} />
        <ScenarioActivityCard activity={scenarioActivity} scenarios={scenarios} onViewFeedback={onViewScenarioFeedback} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Vocabulary"
        storageKey="@sp4h_progress_section_coursematerial_vocab"
        summary={isWeb ? 'Stats available in the mobile app' : `${cardsSeen} of ${cardsTotal} cards seen · ${decksTouched} of ${onLevelVocab.length} decks`}
      >
        {isWeb ? (
          <WebUnavailableCard label="Vocabulary coverage" />
        ) : (
          <>
            {vocabDueCount > 0 && <Text style={styles.dueNote}>{vocabDueCount} cards due today</Text>}
            <VocabCoverageCard coverage={coverage.vocab} />
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Grammar"
        storageKey="@sp4h_progress_section_coursematerial_grammar"
        summary={`${grammarAttempted} of ${onLevelGrammar.length} drill sets attempted`}
      >
        <GrammarCoverageCard coverage={coverage.grammar} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Mocks"
        storageKey="@sp4h_progress_section_coursematerial_mocks"
        summary={`${coverage.mocks.completed} of ${coverage.mocks.total} mocks attempted`}
      >
        {lastMock && (
          <LastMockCard
            mockId={lastMock.mock_id}
            combinedScore={lastMock.combined_score}
            passed={lastMock.passed}
            gatePassed={lastMock.gate_passed}
            completedAt={lastMock.completed_at}
            assignmentResults={lastMock.assignment_results}
          />
        )}
        <MockCoverageCard coverage={coverage.mocks} offLevelCompleted={coverage.offLevelMocksCompleted} />
        {isFull ? (
          <MockHistoryList mocks={mockAttempts} onViewFeedback={onViewMockFeedback} />
        ) : (
          <LockedOverlay
            ctaLabel="Unlock your full mock exam history"
            onUnlock={onUnlockPaywall}
            isSample={mockAttempts.length === 0}
          >
            <MockHistoryList mocks={mockAttempts.length ? mockAttempts : SAMPLE_MOCK_HISTORY} masked={mockAttempts.length > 0} />
          </LockedOverlay>
        )}
      </CollapsibleSection>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  dueNote: { fontSize: Typography.caption, color: Colors.gold, fontWeight: '700', marginBottom: Spacing.xs },
});
