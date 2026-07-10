import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 82;
const LABEL_R = 105;

const CRITERIA = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'content'] as const;
const LABELS = ['Fluency', 'Vocab', 'Grammar', 'Pronunc.', 'Content'];
const ANGLES = CRITERIA.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / 5);

function pt(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function poly(radii: number[]) {
  return radii.map((r, i) => `${pt(ANGLES[i], r).x},${pt(ANGLES[i], r).y}`).join(' ');
}

type Props = {
  scores: { fluency: number; vocabulary: number; grammar: number; pronunciation: number; content: number };
};

export default function RadarChart({ scores }: Props) {
  const dataRadii = CRITERIA.map(c => (scores[c] / 20) * MAX_R);

  return (
    <Svg width={SIZE} height={SIZE}>
      {/* Grid pentagons at 25 / 50 / 75 / 100 % */}
      {[5, 10, 15, 20].map(level => (
        <Polygon
          key={level}
          points={poly([1, 1, 1, 1, 1].map(() => (level / 20) * MAX_R))}
          fill="none"
          stroke="#E8E3DC"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {ANGLES.map((a, i) => {
        const p = pt(a, MAX_R);
        return <Line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#E8E3DC" strokeWidth={1} />;
      })}

      {/* Data fill */}
      <Polygon
        points={poly(dataRadii)}
        fill="rgba(200,151,58,0.22)"
        stroke="#C8973A"
        strokeWidth={2.5}
      />

      {/* Data points */}
      {dataRadii.map((r, i) => {
        const p = pt(ANGLES[i], r);
        return <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill="#C8973A" />;
      })}

      {/* Score labels */}
      {dataRadii.map((r, i) => {
        const p = pt(ANGLES[i], Math.max(r - 10, 8));
        return (
          <SvgText key={i} x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9} fill="#1B3A5C" fontWeight="700">
            {CRITERIA.map(c => scores[c])[i]}
          </SvgText>
        );
      })}

      {/* Axis labels */}
      {ANGLES.map((a, i) => {
        const p = pt(a, LABEL_R);
        const anchor =
          Math.abs(Math.cos(a)) < 0.15 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
        return (
          <SvgText key={i} x={p.x} y={p.y + 4} textAnchor={anchor} fontSize={11} fill="#4A4A4A" fontWeight="600">
            {LABELS[i]}
          </SvgText>
        );
      })}
    </Svg>
  );
}
