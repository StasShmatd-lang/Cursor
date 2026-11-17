import { useParams } from "react-router-dom";
import type { EventStateScreen } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { TimerRing } from "../components/TimerRing";
import { LeaderboardQuiet } from "../components/LeaderboardQuiet";
import { AspectMetricCard } from "../components/AspectMetricCard";
import { ActivityRings, activityRingsFromAspects } from "../components/ActivityRings";
import { ScreenRatingsBreakdown } from "../components/ScreenRatingsBreakdown";
import { HealthCanvas, MetricBlock } from "../ui/HealthLayout";
import { formatScore } from "../lib/formatScore";

export function ScreenPage() {
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
          <p className="text-title-2 text-health-muted">Подключение…</p>
        </div>
      </HealthCanvas>
    );
  }

  const count = ev.roundLive?.ratingsCount ?? 0;
  const showBreakdown = Boolean(!ev.ratingOpen && count > 0 && ev.ratingsBreakdown?.length);
  const showSplash = Boolean(ev.roundLive && count === 0);
  const showLive = Boolean(ev.roundLive && count > 0 && !showBreakdown);

  const ringData = ev.roundLive
    ? activityRingsFromAspects(ev.roundLive.aspects)
    : activityRingsFromAspects([]);

  const splashRings: typeof ringData = [
    { value: 0, color: "var(--health-purple)", label: ringData[0].label },
    { value: 0, color: "var(--health-pink)", label: ringData[1].label },
    { value: 0, color: "var(--health-cyan)", label: ringData[2].label },
  ];

  return (
    <HealthCanvas wide>
      <header className="health-screen-center mb-10 gap-6">
        <div className="w-full">
          <p className="health-nav-title">{ev.title}</p>
          {ev.roundLive ? (
            <>
              <h1 className="health-hero-name text-[56px] leading-[1.05] md:text-[80px]">
                {ev.roundLive.participantName}
              </h1>
              <p className="health-hero-subtitle mt-3 font-normal">{ev.roundLive.title}</p>
            </>
          ) : (
            <h1 className="health-hero-name-warm text-[56px] md:text-[64px]">Ожидаем раунд</h1>
          )}
          {ev.participant?.company && (
            <p className="text-callout mt-3 font-medium" style={{ color: "var(--health-orange)" }}>
              {ev.participant.company}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-10 md:gap-14">
          <TimerRing
            large
            remainingMs={ev.timers.speech.remainingMs}
            totalSec={ev.timers.speech.totalSec}
            running={ev.timers.speech.running}
            label="Выступление"
            accent="var(--health-orange)"
          />
          <TimerRing
            large
            remainingMs={ev.timers.rating.remainingMs}
            totalSec={ev.timers.rating.totalSec}
            running={ev.timers.rating.running}
            label="Оценка"
            accent="var(--health-lime)"
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10">
        <section className="flex w-full max-w-4xl flex-col items-center gap-8">
          {!ev.roundLive && (
            <p className="text-title-2 text-center font-normal text-health-muted">
              Выберите участника и аспекты на панели ведущего
            </p>
          )}

          {showSplash && (
            <div className="health-card-pad flex w-full flex-col items-center justify-center gap-6 px-6 py-12 md:py-16">
              <ActivityRings
                size={340}
                rings={splashRings}
                legend
                center={
                  <>
                    <p className="text-metric-lg" style={{ color: "var(--health-purple)" }}>
                      1–10
                    </p>
                    <p className="text-footnote mt-1 font-medium text-health-muted">шкала</p>
                  </>
                }
              />
              <div className="text-center">
                <p className="text-metric-md health-metric-accent tabular-nums">Оценок: 0</p>
                <p className="text-callout mt-2 font-medium" style={{ color: "var(--health-cyan)" }}>
                  Ждём первую оценку жюри
                </p>
              </div>
            </div>
          )}

          {showLive && ev.roundLive && (
            <>
              <ActivityRings
                size={360}
                rings={ringData}
                legend
                center={
                  <>
                    <p className="text-metric-xl tabular-nums" style={{ color: "var(--health-lime)" }}>
                      {formatScore(ev.roundLive.average)}
                    </p>
                    <p className="text-footnote mt-1 font-semibold" style={{ color: "var(--health-pink)" }}>
                      средний балл
                    </p>
                  </>
                }
              />
              <MetricBlock value={count} label="оценок получено" size="lg" accent="var(--health-lime)" />
              <div className="grid w-full gap-4 md:grid-cols-3">
                {ev.roundLive.aspects.map((a) => (
                  <AspectMetricCard key={a.id} aspect={a} large />
                ))}
              </div>
              <p className="text-callout text-center font-medium" style={{ color: "var(--health-green)" }}>
                {ev.ratingOpen ? "Оценки обновляются в реальном времени" : "Сбор оценок закрыт"}
              </p>
            </>
          )}

          {showBreakdown && ev.ratingsBreakdown && (
            <ScreenRatingsBreakdown rows={ev.ratingsBreakdown} />
          )}
        </section>

        {!showBreakdown && (
          <div className="w-full max-w-md">
            <LeaderboardQuiet rows={ev.leaderboard} />
          </div>
        )}
      </main>
    </HealthCanvas>
  );
}