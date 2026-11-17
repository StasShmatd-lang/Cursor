import type { AspectStat } from "./AspectMetricCard";

const SCORES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

type Props = {
  aspect: Pick<AspectStat, "id" | "title" | "color">;
  value: number | null;
  onChange: (v: number) => void;
};

export function AspectVoteSection({ aspect, value, onChange }: Props) {
  return (
    <div className="health-card-inset space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-headline font-semibold" style={{ color: aspect.color }}>
          {aspect.title}
        </p>
        <p className="text-metric-md tabular-nums" style={{ color: aspect.color }}>
          {value ?? "—"}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {SCORES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`rounded-[10px] py-2.5 text-subhead font-semibold tabular-nums transition ${
              value === s ? "text-white" : "bg-health-track text-health-text"
            }`}
            style={value === s ? { background: aspect.color } : undefined}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}