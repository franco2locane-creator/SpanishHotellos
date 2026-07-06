import type { ExamFormat } from '@/types';

// ── Monologue topics ──────────────────────────────────────────────────────────

export type MonologueTopic = { id: string; topic: string; hint: string };

export const MONOLOGUE_TOPICS: MonologueTopic[] = [
  { id: 'm1', topic: 'Cómo manejar un check-in difícil',         hint: 'Incluye: bienvenida, identificación del problema, solución, disculpa' },
  { id: 'm2', topic: 'La importancia de la satisfacción del cliente', hint: 'Incluye: por qué importa, ejemplos, consecuencias de la insatisfacción' },
  { id: 'm3', topic: 'El papel del conserje en un hotel de lujo', hint: 'Incluye: funciones, habilidades, situaciones comunes' },
  { id: 'm4', topic: 'Gestión de reservas y overbooking',         hint: 'Incluye: causas, cómo prevenirlo, qué hacer cuando ocurre' },
  { id: 'm5', topic: 'El servicio de habitaciones: protocolo',   hint: 'Incluye: proceso del pedido, presentación, situaciones especiales' },
  { id: 'm6', topic: 'Diferencias culturales en la atención al cliente', hint: 'Incluye: ejemplos de diferentes países, adaptación, errores comunes' },
  { id: 'm7', topic: 'Sostenibilidad en la industria hotelera',  hint: 'Incluye: prácticas actuales, beneficios, comunicación al huésped' },
  { id: 'm8', topic: 'Cómo responder a una reseña negativa online', hint: 'Incluye: tono, estructura, solución propuesta, imagen del hotel' },
  { id: 'm9', topic: 'El uso de la tecnología en los hoteles modernos', hint: 'Incluye: check-in digital, apps, ventajas e inconvenientes' },
  { id: 'm10', topic: 'Formación del personal en hostelería',    hint: 'Incluye: habilidades clave, tipos de formación, importancia del inglés y español' },
];

export function randomTopic(): MonologueTopic {
  return MONOLOGUE_TOPICS[Math.floor(Math.random() * MONOLOGUE_TOPICS.length)];
}

// ── Photo scene cards ─────────────────────────────────────────────────────────

export type PhotoScene = {
  id: string;
  scene: string;       // title shown to student
  details: string;     // what the photo shows — student describes this
  emoji: string;
  bgColor: string;
};

export const PHOTO_SCENES: PhotoScene[] = [
  { id: 'ph1', scene: 'Recepción durante el check-in',         details: 'Un recepcionista atiende a una pareja con maletas. Hay una cola de tres huéspedes esperando. El mostrador tiene ordenadores, un teléfono y folletos turísticos.', emoji: '🏨', bgColor: '#EBF3FB' },
  { id: 'ph2', scene: 'Restaurante de hotel: mesa para la cena', details: 'Una mesa elegante con mantel blanco, copas de cristal, cubiertos de plata, velas y una carta de menú. Al fondo, otros comensales sentados.', emoji: '🍽️', bgColor: '#FEF9EC' },
  { id: 'ph3', scene: 'Camarera de pisos limpiando',           details: 'Una camarera con uniforme cambia las sábanas de una cama doble. El cuarto de baño está visible con toallas limpias. El carrito del servicio está en el pasillo.', emoji: '🛏️', bgColor: '#F0FDF4' },
  { id: 'ph4', scene: 'Mostrador de conserjería',              details: 'Un conserje con levita muestra un mapa de la ciudad a un turista. Sobre el mostrador hay folletos, llaves de hotel y una pantalla de ordenador.', emoji: '🗝️', bgColor: '#FDF4FF' },
  { id: 'ph5', scene: 'Desayuno buffet del hotel',            details: 'Un buffet con frutas, bollería, zumos, café y platos calientes. Varios huéspedes sirviéndose. Al fondo, ventanas con luz natural.', emoji: '☕', bgColor: '#FFF7ED' },
  { id: 'ph6', scene: 'Sala de reuniones corporativa',        details: 'Mesa alargada con sillas ejecutivas, proyector encendido, agua y libretas para cada participante. Hay una pantalla con una presentación.', emoji: '💼', bgColor: '#F1F5F9' },
  { id: 'ph7', scene: 'Zona de piscina del hotel',            details: 'Piscina exterior rodeada de tumbonas con toallas. Un camarero sirve bebidas. Algunos huéspedes nadan, otros toman el sol.', emoji: '🏊', bgColor: '#E0F7FA' },
  { id: 'ph8', scene: 'Bar y salón del hotel',                details: 'Un bar iluminado con taburetes altos, botellas en estantes y un bartender preparando cócteles. Algunos clientes charlando en sofás.', emoji: '🍸', bgColor: '#F9F0FF' },
  { id: 'ph9', scene: 'Entrega de servicio a la habitación',  details: 'Un empleado con bandeja cubierta llama a la puerta de una habitación. En la bandeja hay platos tapados, una flor y la cuenta.', emoji: '🛎️', bgColor: '#FFF8EC' },
  { id: 'ph10', scene: 'Cola durante el check-out',           details: 'Varios huéspedes con maletas esperando en recepción. Un recepcionista procesa facturas. El reloj del vestíbulo marca las 11:45.', emoji: '🏃', bgColor: '#FEF0F0' },
];

export function randomPhoto(): PhotoScene {
  return PHOTO_SCENES[Math.floor(Math.random() * PHOTO_SCENES.length)];
}

// ── Spontaneous QA questions ──────────────────────────────────────────────────

export type QaQuestion = { id: string; question: string };

export const QA_QUESTIONS: QaQuestion[] = [
  { id: 'q1',  question: '¿Cuál es el protocolo cuando un huésped pierde su llave de habitación?' },
  { id: 'q2',  question: '¿Cómo manejaría una queja sobre ruido excesivo en habitaciones adyacentes?' },
  { id: 'q3',  question: '¿Qué haría si un cliente solicita hacer el check-in a las seis de la mañana?' },
  { id: 'q4',  question: '¿Cómo explicaría la política de cancelación de reservas del hotel?' },
  { id: 'q5',  question: 'Describa el proceso de check-out de su hotel paso a paso.' },
  { id: 'q6',  question: '¿Qué alternativas ofrecería a un cliente con intolerancia al gluten en el restaurante?' },
  { id: 'q7',  question: '¿Cómo actuaría si el sistema informático falla durante el check-in?' },
  { id: 'q8',  question: 'Un cliente exige una habitación de no fumadores pero solo quedan habitaciones de fumadores. ¿Qué hace?' },
  { id: 'q9',  question: '¿Cómo se despide de un huésped fidelizado que regresa regularmente al hotel?' },
  { id: 'q10', question: 'Describa cómo presentaría la carta de vinos a una mesa en el restaurante del hotel.' },
];

export function randomQuestions(count = 6): QaQuestion[] {
  const shuffled = [...QA_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Format metadata ───────────────────────────────────────────────────────────

type FormatInfo = { label: string; icon: string; duration: string; rules: string[] };

export const FORMAT_INFO: Record<ExamFormat, FormatInfo> = {
  monologue: {
    label: 'Monologue', icon: '🎤',
    duration: '5 min (2 prep + 3 speaking)',
    rules: ['2 minutes to read the topic card', 'Speak for 3 minutes without interruption', 'No notes allowed once speaking begins', 'No transcript shown — exam conditions'],
  },
  guided_dialogue: {
    label: 'Guided Dialogue', icon: '🗣️',
    duration: '8 min conversation',
    rules: ['Converse naturally with the AI examiner', 'No objectives checklist shown', 'No retries if you lose your place', 'Countdown timer runs throughout'],
  },
  picture_description: {
    label: 'Picture Description', icon: '🖼️',
    duration: '2.5 min (30s view + 2 min speaking)',
    rules: ['30 seconds to study the scene', 'Describe and discuss what you see', 'Speak for the full 2 minutes', 'No pausing or rewinding allowed'],
  },
  spontaneous_qa: {
    label: 'Spontaneous Q&A', icon: '❓',
    duration: '6 questions × 30 sec',
    rules: ['6 rapid examiner questions', '30 seconds to answer each one', 'Questions auto-advance when time is up', 'No preparation time between questions'],
  },
};
