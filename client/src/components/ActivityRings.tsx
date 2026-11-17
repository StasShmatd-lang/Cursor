import type { ReactNode } from "react";
import { formatScore } from "../lib/formatScore";

export type ActivityRingDatum = {
  value: number;
  max?: number;
  color: string;
  label?: string;
};

type Props = {
  rings: [ActivityRingDatum, ActivityRingDatum, ActivityRingDatum];
  size?: number;
  center?: ReactNode;
  legend?: boolean;
};

function ringGeometry(size: number, strokes: [number, number, number], gaps: [number, number]) {
  const maxStroke = Math.max(...strokes);
  const outerR = size / 2 - maxStroke / 2 - 4;
  const midR = outerR - strokes[0] / 2 - gaps[0] - strokes[1] / 2;
  const innerR = midR - strokes[1] / 2 - gaps[1] - strokes[2] / 2;
  return { outerR, midR, innerR, cx: size / 2, cy: size / 2 };
}

function ActivityRingArc({
  cx,
  cy,
  r,
  stroke,
  value,
  max = 10,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  stroke: number;
  value: number;
  max?: number;
  color: string;
}) {
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = c * (1 - pct);
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--health-track)"
        strokeWidth={stroke}
        opacity={0.85}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          filter: pct > 0 ? `drop-shadow(0 0 12px ${color}66)` : undefined,
        }}
      />
    </g>
  );
}

export function ActivityRings({ rings, size = 300, center, legend }: Props) {
  const strokes: [number, number, number] = [26, 22, 18];
  const gaps: [number, number] = [10, 8];
  const { outerR, midR, innerR, cx, cy } = ringGeometry(size, strokes, gaps);
  const [a, b, c] = rings;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <ActivityRingArc cx={cx} cy={cy} r={outerR} stroke={strokes[0]} value={a.value} max={a.max} color={a.color} />
          <ActivityRingArc cx={cx} cy={cy} r={midR} stroke={strokes[1]} value={b.value} max={b.max} color={b.color} />
          <ActivityRingArc cx={cx} cy={cy} r={innerR} stroke={strokes[2]} value={c.value} max={c.max} color={c.color} />
        </svg>
        {center !== undefined ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {center}
          </div>
        ) : null}
      </div>
      {legend && (
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {rings.map((ring) => (
            <li key={ring.label ?? ring.color} className="flex items-center gap-2 text-subhead font-semibold">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: ring.color }} />
              <span style={{ color: ring.color }}>{ring.label}</span>
              <span className="tabular-nums text-health-text">{formatScore(ring.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function activityRingsFromAspects(
  aspects: { title: string; color: string; average: number }[],
): [ActivityRingDatum, ActivityRingDatum, ActivityRingDatum] {
  const defaults: ActivityRingDatum[] = [
    { value: 0, color: "var(--health-purple)", label: "Аспект 1" },
    { value: 0, color: "var(--health-pink)", label: "Аспект 2" },
    { value: 0, color: "var(--health-cyan)", label: "Аспект 3" },
  ];
  const mapped: ActivityRingDatum[] = aspects.slice(0, 3).map((a) => ({
    value: a.average,
    color: a.color,
    label: a.title,
  }));
  while (mapped.length < 3) mapped.push({ ...defaults[mapped.length] });
  return mapped as [ActivityRingDatum, ActivityRingDatum, ActivityRingDatum];
}