import type { LeaderboardRow } from "../types";
import { formatScore } from "../lib/formatScore";

type Props = {
  rows: LeaderboardRow[];
};

/** Projector-only: subdued leaderboard — no shouty colors */
export function LeaderboardQuiet({ rows }: Props) {
  if (rows.length === 0) return null;
  const top = Math.max(0.1, rows[0]?.totalScore ?? 0);

  return (
    <aside className="health-card-pad bg-health-elevated">
      <p className="health-section-label mb-3">Общий зачёт</p>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <span className="text-footnote w-5 shrink-0 text-right font-semibold tabular-nums text-health-muted">
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-subhead truncate font-semibold">{row.name}</p>
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-health-track">
                <div
                  className="h-full rounded-full bg-[var(--health-muted)] opacity-55 transition-all duration-700"
                  style={{ width: `${Math.min(100, (row.totalScore / top) * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-headline shrink-0 tabular-nums text-health-label">
              {formatScore(row.totalScore)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}