import type { EventStateScreen, JuryRatingRow, LeaderboardRow } from "../types";
import { ActivityRings, activityRingsFromAspects } from "./ActivityRings";
import { formatScore } from "../lib/formatScore";

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function activeClock(ev: EventStateScreen) {
  const speech = ev.timers.speech;
  const rating = ev.timers.rating;
  if (speech.running) return { label: "Выступление", ms: speech.remainingMs, accent: "var(--health-orange)" };
  if (rating.running || ev.ratingOpen) {
    return { label: "Оценка", ms: rating.remainingMs, accent: "var(--health-lime)" };
  }
  return { label: "Пауза", ms: speech.remainingMs, accent: "var(--health-muted)" };
}

export function BroadcastView({ ev, ring }: { ev: EventStateScreen; ring?: boolean }) {
  const clockState = activeClock(ev);
  const jury = ev.ratingsBreakdown ?? [];
  const showRing = Boolean(ring && ev.roundLive);
  const rings = ev.roundLive ? activityRingsFromAspects(ev.roundLive.aspects) : activityRingsFromAspects([]);

  return (
    <div className="cast-fit">
      <header className="cast-head">
        <div className="min-w-0">
          <p className="health-nav-title">{ev.title}</p>
          <h1 className="cast-name">{ev.roundLive?.participantName ?? "Ожидаем участника"}</h1>
          <p className="text-footnote truncate text-health-muted">
            {ev.participant?.company || "Топ, время и жюри"}
            {ev.roundLive?.title ? ` · ${ev.roundLive.title}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="health-section-label" style={{ color: clockState.accent }}>
            {clockState.label}
          </p>
          <p className="cast-clock" style={{ color: clockState.accent }}>
            {clock(clockState.ms)}
          </p>
        </div>
      </header>

      <div className={showRing ? "cast-body cast-body-ring" : "cast-body"}>
        {showRing ? (
          <section className="cast-ring-slot health-card">
            <ActivityRings
              size={168}
              rings={rings}
              center={
                <p className="text-title-1 tabular-nums" style={{ color: "var(--health-lime)" }}>
                  {ev.roundLive ? formatScore(ev.roundLive.average) : "—"}
                </p>
              }
            />
          </section>
        ) : null}
        <TopList rows={ev.leaderboard} currentId={ev.roundLive?.participantId ?? null} />
        <JuryBoard rows={jury} />
      </div>
    </div>
  );
}

function TopList({ rows, currentId }: { rows: LeaderboardRow[]; currentId: string | null }) {
  const roomy = rows.length > 0 && rows.length <= 6;
  return (
    <section className="cast-panel health-card-pad">
      <p className="health-section-label mb-2 shrink-0">Топ участников</p>
      {rows.length === 0 ? (
        <p className="text-footnote text-health-muted">Имена появятся, когда ведущий добавит участников</p>
      ) : (
        <ol className="cast-panel-body cast-top-list">
          {rows.map((row) => (
            <li key={row.id} className="cast-row">
              <span className="cast-rank">{row.rank}</span>
              <div className="min-w-0 flex-1">
                <p className="cast-person text-health-text">
                  {row.name}
                  {row.id === currentId ? <span className="cast-now"> сейчас</span> : null}
                </p>
                {roomy && row.company ? <p className="cast-meta">{row.company}</p> : null}
              </div>
              <span className="cast-score">{row.totalScore > 0 ? formatScore(row.totalScore) : "—"}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function JuryBoard({ rows }: { rows: JuryRatingRow[] }) {
  const roomy = rows.length > 0 && rows.length <= 4;
  return (
    <section className="cast-panel health-card-pad">
      <div className="mb-2 flex shrink-0 items-baseline justify-between gap-3">
        <p className="health-section-label">Проголосовали</p>
        <p className="text-footnote tabular-nums text-health-muted">{rows.length}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-footnote text-health-muted">Имена появятся, когда жюри отправит оценки</p>
      ) : (
        <ul className="cast-panel-body cast-jury">
          {rows.map((row) => (
            <li key={`${row.name}-${row.company}`} className="cast-cell health-card-inset">
              <p className="cast-person text-health-text">{row.name}</p>
              {roomy && row.company ? <p className="cast-meta">{row.company}</p> : null}
              <p className="cast-score">{formatScore(row.total)}</p>
              {roomy ? (
                <p className="cast-meta">
                  {row.perAspect.map((aspect) => `${aspect.title} ${formatScore(aspect.score)}`).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
