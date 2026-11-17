import type { ScorePoint } from "../types";
import { formatScore } from "../lib/formatScore";

type Props = {
  name: string;
  company?: string;
  total: number;
  track: ScorePoint[];
  compact?: boolean;
};

export function ScoreTrack({ name, company, total, track, compact }: Props) {
  const maxBar = Math.max(10, ...track.map((t) => t.score));

  return (
    <div className="health-card-pad">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-title-3 truncate">{name}</p>
          {company && <p className="text-subhead mt-0.5 text-health-muted">{company}</p>}
        </div>
        {!compact && (
          <div className="shrink-0 text-right">
            <p className="text-metric-md">{formatScore(total)}</p>
            <p className="text-caption">сумма</p>
          </div>
        )}
      </div>
      {track.length === 0 ? (
        <p className="text-callout text-health-muted">Пока нет оценок</p>
      ) : (
        <ul className="space-y-3.5">
          {track.map((pt) => (
            <li key={pt.roundId}>
              <div className="mb-1.5 flex justify-between gap-2">
                <span className="text-footnote truncate font-medium text-health-label">{pt.title}</span>
                <span className="text-subhead shrink-0 font-semibold tabular-nums">
                  {formatScore(pt.score)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-health-track">
                <div
                  className="h-full rounded-full bg-[var(--health-pink)] transition-all duration-500 ease-out"
                  style={{ width: `${(pt.score / maxBar) * 100}%`, opacity: 0.85 }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}