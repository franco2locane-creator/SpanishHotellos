import type { MockExamData, Assignment, MockLevel, CheckinData, RestaurantData, HotelPresentationData, JobInterviewData, ComplaintData, SayingNoData } from '@/types';
import type { Scenario, ScenarioObjective } from '@/types';

// ── Static imports (bundler must resolve these at build time) ─────────────────

const MOCK_MODULES: Record<string, () => MockExamData> = {
  'basic-1':  () => require('@/content/mocks/basic-1.json'),
  'basic-2':  () => require('@/content/mocks/basic-2.json'),
  'basic-3':  () => require('@/content/mocks/basic-3.json'),
  'basic-4':  () => require('@/content/mocks/basic-4.json'),
  'basic-5':  () => require('@/content/mocks/basic-5.json'),
  'basic-6':  () => require('@/content/mocks/basic-6.json'),
  'basic-7':  () => require('@/content/mocks/basic-7.json'),
  'basic-8':  () => require('@/content/mocks/basic-8.json'),
  'basic-9':  () => require('@/content/mocks/basic-9.json'),
  'basic-10': () => require('@/content/mocks/basic-10.json'),
  'int-1':    () => require('@/content/mocks/int-1.json'),
  'int-2':    () => require('@/content/mocks/int-2.json'),
  'int-3':    () => require('@/content/mocks/int-3.json'),
  'int-4':    () => require('@/content/mocks/int-4.json'),
  'int-5':    () => require('@/content/mocks/int-5.json'),
  'int-6':    () => require('@/content/mocks/int-6.json'),
  'int-7':    () => require('@/content/mocks/int-7.json'),
  'int-8':    () => require('@/content/mocks/int-8.json'),
  'int-9':    () => require('@/content/mocks/int-9.json'),
  'int-10':   () => require('@/content/mocks/int-10.json'),
};

// ── Public API ────────────────────────────────────────────────────────────────

/** Total number of mock exams across all levels — always derived from MOCK_MODULES. */
export const TOTAL_MOCK_COUNT = Object.keys(MOCK_MODULES).length;

export function loadMock(id: string): MockExamData | null {
  return MOCK_MODULES[id]?.() ?? null;
}

export function getMockList(level: MockLevel, isPremium: boolean): MockExamData[] {
  const prefix = level === 'basic' ? 'basic' : 'int';
  const ids = Object.keys(MOCK_MODULES).filter(k => k.startsWith(prefix + '-'));
  const all = ids.map(id => MOCK_MODULES[id]()).filter(Boolean);
  if (!isPremium) return all.slice(0, 1); // basic-1 / int-1 only (free tier = 1 mock)
  return all;
}

export function isMockFree(mockId: string): boolean {
  return mockId === 'basic-1' || mockId === 'int-1';
}

// ── Build Scenario from an Assignment (for the existing roleplay Edge Function) ─

const EQUAL_WEIGHTS = { fluency: 0.2, vocabulary: 0.2, grammar: 0.2, pronunciation: 0.2, content: 0.2 };

export function assignmentToScenario(assignment: Assignment, mockId: string, isPremium: boolean): Scenario {
  const base = {
    id: `mock-${mockId}-${assignment.type}-${assignment.number}`,
    titleEs: assignmentTitle(assignment),
    title: assignmentTitle(assignment),
    description: '',
    department: assignmentDepartment(assignment) as Scenario['department'],
    difficulty: 2 as const,
    examFormats: ['guided_dialogue'] as Scenario['examFormats'],
    rubricWeights: EQUAL_WEIGHTS,
    isFree: isMockFree(mockId) || isPremium,
    durationMinutes: 8,
    // Generated on the fly from mock content, already gated by the mock's own
    // level — not shown in a level-filtered picker, so both levels are fine here.
    courseLevels: ['basic', 'intermediate'] as Scenario['courseLevels'],
  };

  switch (assignment.type) {
    case 'checkin':       return { ...base, ...buildCheckinContext(assignment.data) };
    case 'restaurant':    return { ...base, ...buildRestaurantContext(assignment.data) };
    case 'hotel_presentation': return { ...base, ...buildHotelPresentationContext(assignment.data) };
    case 'job_interview': return { ...base, ...buildJobInterviewContext(assignment.data) };
    case 'complaint':     return { ...base, ...buildComplaintContext(assignment.data) };
    case 'saying_no':     return { ...base, ...buildSayingNoContext(assignment.data) };
    default:
      return { ...base, guestPersona: neutralGuest('El huésped'), objectives: [], systemContext: '', openingLine: '...' };
  }
}

// ── Assignment helpers ────────────────────────────────────────────────────────

function assignmentTitle(a: Assignment): string {
  switch (a.type) {
    case 'personal_presentation': return 'Presentación personal';
    case 'checkin':               return 'Check-in en recepción';
    case 'restaurant':            return 'Servicio en restaurante';
    case 'hotel_presentation':    return 'Presentación del hotel';
    case 'job_interview':         return 'Entrevista de trabajo';
    case 'complaint':             return 'Gestión de queja';
    case 'saying_no':             return 'Denegación educada';
  }
}

function assignmentDepartment(a: Assignment): string {
  switch (a.type) {
    case 'personal_presentation': return 'management';
    case 'checkin':               return 'front_office';
    case 'restaurant':            return 'fnb';
    case 'hotel_presentation':    return 'management';
    case 'job_interview':         return 'management';
    case 'complaint':             return 'front_office';
    case 'saying_no':             return 'front_office';
  }
}

function neutralGuest(name: string): Scenario['guestPersona'] {
  return { name, nationality: 'internacional', mood: 'neutral', speakingSpeed: 'normal', description: '' };
}

function checklistToObjectives(checklist: string[]): ScenarioObjective[] {
  return checklist.map((item, i) => ({ id: `obj-${i}`, label: item }));
}

// ── Per-type context builders ─────────────────────────────────────────────────

function buildCheckinContext(d: CheckinData) {
  const r = d.reservations[0];
  const allRes = d.reservations.map(res =>
    `${res.guestName}: ${res.nights} noches, ${res.persons} persona(s), habitación ${res.roomType}, vista ${res.view}`
  ).join(' | ');

  const facilities = d.hotelInfo.map(h => `${h.label}: ${h.detail}`).join('; ');

  const systemContext =
    `Estás haciendo el check-in en ${d.hotelName}, ${d.hotelCity}. Son las ${d.timeOfDay}. ` +
    `Tu nombre es ${r.guestName}. Tienes reserva para ${r.nights} noches, ${r.persons} persona(s), ` +
    `habitación ${r.roomType}, vista ${r.view}. ` +
    `Reservas en el sistema: ${allRes}. ` +
    `Información del hotel: ${facilities}. ` +
    `Check-out: ${d.checkoutTime}. ` +
    `Desayuno ${d.breakfastIncluded ? 'incluido' : 'no incluido'}. ` +
    `Walk-in: ${d.walkIn}.`;

  return {
    guestPersona: { ...neutralGuest(r.guestName), mood: 'neutral' as const },
    objectives: checklistToObjectives(d.checklist),
    systemContext,
    openingLine: `Buenas, vengo a hacer el check-in. Tengo una reserva a nombre de ${r.guestName}.`,
  };
}

function buildRestaurantContext(d: RestaurantData) {
  const r = d.reservations[0];
  const dish = d.dishOfDay;
  const systemContext =
    `Estás en ${d.restaurantName} del ${d.hotelName}, ${d.hotelCity}. Son las ${d.timeOfDay}. ` +
    `Tienes una reserva a nombre de ${r.guestName}, mesa para ${r.covers} personas, ` +
    `preferencia: ${r.seating}. ` +
    `Plato del día: ${dish.name} (${dish.ingredients}; elaboración: ${dish.cookingMethod}; sabor: ${dish.flavourTexture}). ` +
    `Si no hay mesa disponible: ${d.noTableSituation}.`;

  return {
    guestPersona: { ...neutralGuest(r.guestName), mood: 'neutral' as const },
    objectives: checklistToObjectives(d.checklist),
    systemContext,
    openingLine: `Buenas noches. Tengo una reserva a nombre de ${r.guestName}.`,
  };
}

function buildHotelPresentationContext(d: HotelPresentationData) {
  const room = d.featuredRoom;
  const systemContext =
    `Estás escuchando la presentación del ${d.hotelName} en ${d.hotelCity}. ` +
    `Slogan: "${d.sloganCompletion}". Estilo: ${d.architectureStyle}. ` +
    `Habitación destacada: ${room.type}; mobiliario: ${room.furniture.join(', ')}; ` +
    `baño: ${room.bathroomFeature}. ` +
    `Shuttle: €${d.shuttlePriceEuros}. ` +
    `${d.extraFacility.name}: ${d.extraFacility.hours}${d.extraFacility.priceNote ? ' (' + d.extraFacility.priceNote + ')' : ''}. ` +
    `Público objetivo: ${d.targetAudience}. ` +
    `Cuando el personal haga una pausa, haz UNA de estas preguntas: ${d.guestQuestions.join(' / ')}.`;

  return {
    guestPersona: { ...neutralGuest('El visitante'), mood: 'friendly' as const },
    objectives: checklistToObjectives(d.checklist),
    systemContext,
    openingLine: `Buenos días. Me interesa conocer más sobre el hotel.`,
  };
}

function buildJobInterviewContext(d: JobInterviewData) {
  const systemContext =
    `Eres el entrevistador en ${d.hotelName}, ${d.hotelCity} para el puesto de ${d.position}. ` +
    `Contexto: ${d.context}. ` +
    `Haz exactamente estas preguntas en orden, una a la vez, y espera la respuesta del candidato: ` +
    d.assessorQuestions.map((q, i) => `${i + 1}. ${q}`).join(' | ');

  return {
    guestPersona: { ...neutralGuest('La directora de RRHH'), nationality: 'española', mood: 'neutral' as const },
    objectives: checklistToObjectives(d.checklist),
    systemContext,
    openingLine: `Buenos días. Tome asiento, por favor. He revisado su candidatura para el puesto de ${d.position}.`,
  };
}

function buildComplaintContext(d: ComplaintData) {
  const systemContext =
    `Eres el huésped ${d.guestName} en ${d.hotelName}, ${d.hotelCity}. Son las ${d.timeOfDay}. ` +
    `Tu queja: ${d.complaintScenario}. Problema concreto: ${d.problemDetails}. ` +
    `Estás frustrado/a. Exige una solución. ` +
    `Acepta amablemente si el personal te ofrece alguna de estas opciones: ${d.resolutionOptions.join(', ')}.`;

  return {
    guestPersona: { ...neutralGuest(d.guestName), mood: 'frustrated' as const, speakingSpeed: 'fast' as const },
    objectives: checklistToObjectives(d.checklist),
    systemContext,
    openingLine: `¡Necesito hablar con alguien ahora mismo! Esto es completamente inaceptable.`,
  };
}

function buildSayingNoContext(d: SayingNoData) {
  const systemContext =
    `Eres un huésped en ${d.hotelName}, ${d.hotelCity}. Son las ${d.timeOfDay}. ` +
    `Estás haciendo esta petición: ${d.requestContext}. ` +
    `La razón por la que no pueden atenderte: ${d.reasonForNo}. ` +
    `Si el personal explica educadamente la razón y ofrece alguna de estas alternativas: ${d.alternatives.join(', ')}, acepta.`;

  return {
    guestPersona: { ...neutralGuest('El huésped'), mood: 'confused' as const },
    objectives: checklistToObjectives(d.checklist),
    systemContext,
    openingLine: `Disculpe, necesito pedirle un favor especial, si es posible.`,
  };
}
