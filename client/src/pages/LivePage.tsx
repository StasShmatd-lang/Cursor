import { useParams } from "react-router-dom";
import type { EventStateScreen, JuryRatingRow, LeaderboardRow } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { HealthCanvas } from "../ui/HealthLayout";
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

function juryDensity(count: number) {
  if (count <= 4) return "few";
  if (count <= 12) return "mid";
  return "many";
}

export function LivePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { state: ev, error } = useEventSocket<EventStateScreen>(eventId, "screen");

  if (error) {
    return (
      <HealthCanvas wide>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-title-1 text-[var(--health-pink)]">{error}</p>
        </div>
      </HealthCanvas>
    );
  }

  if (!ev) {
    return (
      <HealthCanvas wide>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-title-2 text-health-muted">Трансляция…</p>
        </div>
      </HealthCanvas>
    );
  }

  const clockState = activeClock(ev);
  const jury = ev.ratingsBreakdown ?? [];
  const density = juryDensity(jury.length);
  const top = ev.leaderboard;

  return (
    <HealthCanvas wide>
      <div className="cast-page">
        <header className="cast-head">
          <div className="min-w-0">
            <p className="health-nav-title">{ev.title}</p>
            <h1 className="health-hero-name mt-2 truncate text-[40px] leading-none md:text-[64px]">
              {ev.roundLive?.participantName ?? "Ожидаем участника"}
            </h1>
            <p className="text-callout mt-3 truncate text-health-muted">
              {ev.participant?.company ? `${ev.participant.company}` : "Топ, время и жюри"}
              {ev.roundLive?.title ? ` · ${ev.roundLive.title}` : ""}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="health-section-label" style={{ color: clockState.accent }}>
              {clockState.label}
            </p>
            <p className="cast-clock" style={{ color: clockState.accent }}>
              {clock(clockState.ms)}
            </p>
          </div>
        </header>

        <div className="cast-body">
          <TopList rows={top} currentId={ev.roundLive?.participantId ?? null} />
          <JuryBoard rows={jury} density={density} />
        </div>
      </div>
    </HealthCanvas>
  );
}

function TopList({ rows, currentId }: { rows: LeaderboardRow[]; currentId: string | null }) {
  const compact = rows.length > 8;
  return (
    <section className="health-card-pad">
      <p className="health-section-label mb-4">Топ участников</p>
      {rows.length === 0 ? (
        <p className="text-callout text-health-muted">Имена появятся, когда ведущий добавит участников</p>
      ) : (
        <ol className={`cast-top-list ${compact ? "max-h-[70vh] overflow-auto pr-1" : ""}`}>
          {rows.map((row) => {
            const current = row.id === currentId;
            return (
              <li key={row.id} className="flex min-w-0 items-center gap-3">
                <span
                  className={`w-7 shrink-0 text-right font-semibold tabular-nums ${
                    compact ? "text-footnote" : "text-title-2"
                  }`}
                  style={{ color: row.rank === 1 ? "var(--health-lime)" : "var(--health-muted)" }}
                >
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${compact ? "text-subhead" : "text-title-2"}`}>
                    {row.name}
                    {current ? <span className="text-footnote ml-2 font-medium text-[var(--health-orange)]">сейчас</span> : null}
                  </p>
                  {!compact && row.company ? (
                    <p className="text-footnote truncate text-health-muted">{row.company}</p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 tabular-nums ${compact ? "text-headline" : "text-metric-md"}`}
                  style={{ color: row.totalScore > 0 ? "var(--health-text)" : "var(--health-muted)" }}
                >
                  {row.totalScore > 0 ? formatScore(row.totalScore) : "—"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function JuryBoard({ rows, density }: { rows: JuryRatingRow[]; density: "few" | "mid" | "many" }) {
  return (
    <section className="health-card-pad">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="health-section-label">Жюри</p>
        <p className="text-footnote tabular-nums text-health-muted">{rows.length}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-callout text-health-muted">Имена появятся здесь, когда жюри отправит оценки</p>
      ) : (
        <ul className={`cast-jury cast-jury-${density}`}>
          {rows.map((row) => (
            <li key={`${row.name}-${row.company}`} className="health-card-inset min-w-0 px-3 py-3">
              <p className={`truncate font-semibold ${density === "many" ? "text-subhead" : "text-title-2"}`}>
                {row.name}
              </p>
              {density !== "many" && row.company ? (
                <p className="text-footnote truncate text-health-muted">{row.company}</p>
              ) : null}
              <p
                className={`mt-2 tabular-nums ${density === "few" ? "text-metric-md" : "text-headline"}`}
                style={{ color: "var(--health-lime)" }}
              >
                {formatScore(row.total)}
              </p>
              {density === "few" ? (
                <p className="text-footnote mt-1 truncate text-health-muted">
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
