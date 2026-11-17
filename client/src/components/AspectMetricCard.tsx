import { ScoreRing } from "./ScoreRing";
import { formatScore } from "../lib/formatScore";

export type AspectStat = {
  id: number;
  title: string;
  color: string;
  average: number;
};

type Props = {
  aspect: AspectStat;
  compact?: boolean;
  large?: boolean;
};

export function AspectMetricCard({ aspect, compact, large }: Props) {
  if (large) {
    return (
      <div className="health-card-pad flex min-w-[200px] flex-1 flex-col items-center gap-3 px-6 py-8">
        <p className="text-headline w-full font-semibold" style={{ color: aspect.color }}>
          {aspect.title}
        </p>
        <p className="text-metric-lg" style={{ color: aspect.color }}>
          {formatScore(aspect.average)}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-health-track">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(aspect.average / 10) * 100}%`, background: aspect.color }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`health-card-inset min-w-0 ${compact ? "px-2 py-2" : ""}`}>
      <p className="text-footnote mb-1 text-center font-semibold uppercase tracking-wide" style={{ color: aspect.color }}>
        {aspect.title}
      </p>
      <div className="flex justify-center">
        <ScoreRing
          value={aspect.average}
          color={aspect.color}
          size={compact ? 58 : 88}
          stroke={compact ? 3 : 4}
        />
      </div>
    </div>
  );
}