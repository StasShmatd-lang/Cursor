type Props = {
  remainingMs: number;
  totalSec: number;
  running: boolean;
  label: string;
  accent?: string;
  large?: boolean;
};

function formatMs(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimerRing({
  remainingMs,
  totalSec,
  running,
  label,
  accent = "#5ac8fa",
  large,
}: Props) {
  const size = large ? 184 : 128;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = totalSec > 0 ? remainingMs / (totalSec * 1000) : 0;
  const offset = c * (1 - Math.min(1, pct));
  const timeSize = large ? 40 : 28;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--health-track)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={running ? accent : "var(--health-track)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-semibold tabular-nums tracking-tight text-health-text"
            style={{ fontSize: timeSize }}
          >
            {formatMs(remainingMs)}
          </span>
          <span className="text-caption font-medium text-health-muted">
            {running ? "идёт" : "пауза"}
          </span>
        </div>
      </div>
      <span className="text-footnote font-medium text-health-muted">{label}</span>
    </div>
  );
}