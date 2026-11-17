import type { JuryRatingRow } from "../types";
import { formatScore } from "../lib/formatScore";

export function ScreenRatingsBreakdown({ rows }: { rows: JuryRatingRow[] }) {
  return (
    <div className="w-full space-y-4 text-center">
      <p className="health-section-label">Итог голосования — каждая оценка жюри</p>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li key={`${row.name}|${row.company}`} className="health-card-pad space-y-4 px-6 py-6">
            <div>
              <p className="text-title-3 font-semibold text-health-text">{row.name}</p>
              <p className="text-callout text-health-muted">{row.company}</p>
            </div>
            <ul className="space-y-2">
              {row.perAspect.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-3 text-subhead">
                  <span className="flex items-center gap-2 text-health-muted">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                    {a.title}
                  </span>
                  <span className="font-semibold tabular-nums text-health-text">{formatScore(a.score)}</span>
                </li>
              ))}
            </ul>
            <p className="text-footnote health-divider pt-3 text-health-muted">
              Среднее по карточке:{" "}
              <span className="font-semibold text-[var(--health-lime)]">{formatScore(row.total)}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}