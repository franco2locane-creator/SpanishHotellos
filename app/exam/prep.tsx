import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadMock } from '@/lib/mockExam/loader';
import { useMockExamStore } from '@/stores/mockExamStore';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { Assignment, CheckinData, RestaurantData, HotelPresentationData, JobInterviewData, ComplaintData, SayingNoData } from '@/types';

const PREP_SECONDS = 120;

export default function PrepScreen() {
  const { mockId, assignmentIdx: idxStr } = useLocalSearchParams<{ mockId: string; assignmentIdx: string }>();
  const router = useRouter();
  const { exam, startExam, saveKeywords, keywordNotes } = useMockExamStore();

  const idx = parseInt(idxStr ?? '0', 10);
  const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS);
  const [keywords, setKeywords] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load exam into store if navigating fresh (e.g. deep link)
  useEffect(() => {
    if (!exam && mockId) {
      const loaded = loadMock(mockId);
      if (loaded) startExam(loaded);
    }
  }, [mockId]);

  // Pre-fill keywords if returning to a prep screen
  useEffect(() => {
    if (keywordNotes[idx]) setKeywords(keywordNotes[idx]);
  }, [idx]);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const currentMock = exam ?? loadMock(mockId ?? '');
  const assignment = currentMock?.assignments[idx];

  function handleBegin() {
    saveKeywords(idx, keywords);
    if (!assignment) return;

    const nextRoute = assignment.type === 'personal_presentation'
      ? `/exam/assignment-monologue?mockId=${mockId}&assignmentIdx=${idx}`
      : `/exam/assignment-roleplay?mockId=${mockId}&assignmentIdx=${idx}`;
    router.replace(nextRoute as any);
  }

  if (!assignment) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.err}>Assignment not found.</Text>
      </SafeAreaView>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.typeChip}>
          <Text style={styles.typeChipText}>{assignmentLabel(assignment)}</Text>
        </View>
        <Text style={[styles.timer, secondsLeft <= 30 && styles.timerWarning]}>{mm}:{ss}</Text>
        <Text style={styles.prepLabel}>prep time</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ReferenceCard assignment={assignment} />

        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>Keyword notes (max 5 words)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g. bienvenida · reserva · desayuno · piscina · llave"
            placeholderTextColor={Colors.textMuted}
            value={keywords}
            onChangeText={setKeywords}
            maxLength={80}
            multiline
          />
        </View>

        <View style={styles.examRules}>
          <Text style={styles.examRulesTitle}>Exam conditions</Text>
          <Text style={styles.examRulesText}>
            {'• Reference card hidden once you begin\n'}
            {'• No hints or objectives shown\n'}
            {'• Speak Spanish only — formal register (usted)'}
          </Text>
        </View>

        <TouchableOpacity style={styles.beginBtn} onPress={handleBegin} activeOpacity={0.85}>
          <Text style={styles.beginBtnText}>Begin Assignment {idx + 1}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Reference card ────────────────────────────────────────────────────────────

function ReferenceCard({ assignment }: { assignment: Assignment }) {
  switch (assignment.type) {
    case 'personal_presentation': return <PersonalPrepCard data={assignment.data} />;
    case 'checkin':               return <CheckinRefCard data={assignment.data} />;
    case 'restaurant':            return <RestaurantRefCard data={assignment.data} />;
    case 'hotel_presentation':    return <HotelPresentRefCard data={assignment.data} />;
    case 'job_interview':         return <JobInterviewRefCard data={assignment.data} />;
    case 'complaint':             return <ComplaintRefCard data={assignment.data} />;
    case 'saying_no':             return <SayingNoRefCard data={assignment.data} />;
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function PersonalPrepCard({ data }: { data: import('@/types').PersonalPresentationData }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>Topics (you will be assigned one)</Text>
      {data.topics.map((t, i) => (
        <Text key={i} style={styles.bullet}>• {t}</Text>
      ))}
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Possible assessor questions</Text>
      {data.assessorQuestions.map((q, i) => (
        <Text key={i} style={styles.bullet}>• {q}</Text>
      ))}
    </Card>
  );
}

function CheckinRefCard({ data }: { data: CheckinData }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{data.hotelName} — {data.hotelCity} — {data.timeOfDay}</Text>
      {data.reservations.map((r, i) => (
        <View key={i} style={styles.resBlock}>
          <Text style={styles.resName}>{r.guestName}</Text>
          <Text style={styles.resDetail}>{r.nights}n · {r.persons}p · {r.roomType} · {r.view}</Text>
        </View>
      ))}
      <Row label="Walk-in" value={data.walkIn} />
      <Row label="Checkout" value={data.checkoutTime} />
      <Row label="Breakfast" value={data.breakfastIncluded ? 'Included' : 'Not included'} />
      {data.hotelInfo.map((h, i) => (
        <Row key={i} label={h.label} value={h.detail} />
      ))}
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Checklist</Text>
      {data.checklist.map((c, i) => <Text key={i} style={styles.bullet}>□ {c}</Text>)}
    </Card>
  );
}

function RestaurantRefCard({ data }: { data: RestaurantData }) {
  const d = data.dishOfDay;
  return (
    <Card>
      <Text style={styles.cardTitle}>{data.restaurantName} · {data.hotelName} · {data.timeOfDay}</Text>
      {data.reservations.map((r, i) => (
        <View key={i} style={styles.resBlock}>
          <Text style={styles.resName}>{r.guestName}</Text>
          <Text style={styles.resDetail}>{r.covers} covers · {r.seating}</Text>
        </View>
      ))}
      <Row label="No table" value={data.noTableSituation} />
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Dish of the day</Text>
      <Text style={styles.dishName}>{d.name}</Text>
      <Row label="Ingredients" value={d.ingredients} />
      <Row label="Method" value={d.cookingMethod} />
      <Row label="Flavour" value={d.flavourTexture} />
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Checklist</Text>
      {data.checklist.map((c, i) => <Text key={i} style={styles.bullet}>□ {c}</Text>)}
    </Card>
  );
}

function HotelPresentRefCard({ data }: { data: HotelPresentationData }) {
  const r = data.featuredRoom;
  return (
    <Card>
      <Text style={styles.cardTitle}>{data.hotelName} · {data.hotelCity}</Text>
      <Row label="Slogan" value={data.sloganCompletion} />
      <Row label="Style" value={data.architectureStyle} />
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Featured room: {r.type}</Text>
      <Row label="Furniture" value={r.furniture.join(', ')} />
      <Row label="Bathroom" value={r.bathroomFeature} />
      <Row label="Shuttle" value={`€${data.shuttlePriceEuros}`} />
      <Row label={data.extraFacility.name} value={`${data.extraFacility.hours}${data.extraFacility.priceNote ? ' · ' + data.extraFacility.priceNote : ''}`} />
      <Row label="Audience" value={data.targetAudience} />
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Guest questions</Text>
      {data.guestQuestions.map((q, i) => <Text key={i} style={styles.bullet}>• {q}</Text>)}
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Checklist</Text>
      {data.checklist.map((c, i) => <Text key={i} style={styles.bullet}>□ {c}</Text>)}
    </Card>
  );
}

function JobInterviewRefCard({ data }: { data: JobInterviewData }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{data.position} — {data.hotelName}, {data.hotelCity}</Text>
      <Text style={styles.bullet}>{data.context}</Text>
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Assessor questions</Text>
      {data.assessorQuestions.map((q, i) => <Text key={i} style={styles.bullet}>{i + 1}. {q}</Text>)}
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Checklist</Text>
      {data.checklist.map((c, i) => <Text key={i} style={styles.bullet}>□ {c}</Text>)}
    </Card>
  );
}

function ComplaintRefCard({ data }: { data: ComplaintData }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{data.hotelName} · {data.hotelCity} · {data.timeOfDay}</Text>
      <Row label="Scenario" value={data.complaintScenario} />
      <Row label="Guest" value={data.guestName} />
      <Row label="Problem" value={data.problemDetails} />
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Resolution options</Text>
      {data.resolutionOptions.map((o, i) => <Text key={i} style={styles.bullet}>• {o}</Text>)}
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Checklist</Text>
      {data.checklist.map((c, i) => <Text key={i} style={styles.bullet}>□ {c}</Text>)}
    </Card>
  );
}

function SayingNoRefCard({ data }: { data: SayingNoData }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{data.hotelName} · {data.hotelCity} · {data.timeOfDay}</Text>
      <Row label="Request" value={data.requestContext} />
      <Row label="Reason" value={data.reasonForNo} />
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Alternatives to offer</Text>
      {data.alternatives.map((a, i) => <Text key={i} style={styles.bullet}>• {a}</Text>)}
      <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Checklist</Text>
      {data.checklist.map((c, i) => <Text key={i} style={styles.bullet}>□ {c}</Text>)}
    </Card>
  );
}

function assignmentLabel(a: Assignment): string {
  const map: Record<string, string> = {
    personal_presentation: 'Presentación personal',
    checkin: 'Check-in',
    restaurant: 'Restaurante',
    hotel_presentation: 'Presentación del hotel',
    job_interview: 'Entrevista de trabajo',
    complaint: 'Gestión de queja',
    saying_no: 'Denegación educada',
  };
  return map[a.type] ?? a.type;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, padding: Spacing.lg, alignItems: 'center', gap: 4 },
  typeChip: { backgroundColor: Colors.gold, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  typeChipText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.caption },
  timer: { fontSize: 48, fontWeight: Typography.bold, color: '#fff', letterSpacing: 2 },
  timerWarning: { color: '#FF6B6B' },
  prepLabel: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTitle: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 4 },
  rowLabel: { fontSize: Typography.caption, color: Colors.textMuted, width: 80, flexShrink: 0, fontWeight: Typography.medium },
  rowValue: { flex: 1, fontSize: Typography.caption, color: Colors.textPrimary, lineHeight: 18 },
  resBlock: { backgroundColor: Colors.surfaceAlt, borderRadius: Radii.sm, padding: Spacing.sm, marginBottom: Spacing.xs },
  resName: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
  resDetail: { fontSize: Typography.caption, color: Colors.textSecondary },
  dishName: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy, marginBottom: Spacing.xs },
  bullet: { fontSize: Typography.caption, color: Colors.textPrimary, lineHeight: 20, marginBottom: 2 },
  noteSection: { marginBottom: Spacing.md },
  noteTitle: { fontSize: Typography.caption, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  noteInput: { backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, fontSize: Typography.body, color: Colors.textPrimary, minHeight: 60, ...Shadows.sm },
  examRules: { backgroundColor: '#EEF3F9', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md },
  examRulesTitle: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },
  examRulesText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 20 },
  beginBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.xl },
  beginBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  err: { padding: Spacing.xl, color: Colors.error },
});
