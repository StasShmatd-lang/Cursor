import { formatScore } from "../lib/formatScore";

type Props = {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
  sublabel?: string;
  trackColor?: string;
};

export function ScoreRing({
  value,
  max = 10,
  size = 120,
  stroke = 5,
  label,
  color = "#ff2d55",
  sublabel,
  trackColor = "var(--health-track)",
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = c * (1 - pct);
  const display = formatScore(value);
  const numSize = Math.round(size * 0.26);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-health-text"
          role="img"
          aria-label={label ? `${label}: ${display}` : display}
        >
          <span className="font-semibold tabular-nums tracking-tight" style={{ fontSize: numSize }}>
            {display}
          </span>
          {sublabel && <span className="text-caption mt-0.5 font-medium text-health-muted">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-footnote text-center font-medium text-health-muted">{label}</span>}
    </div>
  );
}