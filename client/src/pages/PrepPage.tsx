import { useParams } from "react-router-dom";
import type { EventStatePrep } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { TimerRing } from "../components/TimerRing";
import { HealthCanvas } from "../ui/HealthLayout";

export function PrepPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { state: ev, error } = useEventSocket<EventStatePrep>(eventId, "prep");

  if (error) {
    return (
      <HealthCanvas laptop>
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-title-2 text-[var(--health-pink)]">{error}</p>
        </div>
      </HealthCanvas>
    );
  }

  if (!ev) {
    return (
      <HealthCanvas laptop>
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-title-2 text-health-muted">Подключение…</p>
        </div>
      </HealthCanvas>
    );
  }

  return (
    <HealthCanvas laptop>
      <div className="flex min-h-[72vh] flex-col items-center justify-center gap-12 text-center">
        <div>
          <p className="health-section-label">{ev.title}</p>
          {ev.roundLive ? (
            <>
              <h1 className="health-hero-name mt-4 text-[52px] md:text-[64px]">{ev.roundLive.participantName}</h1>
              <p className="text-title-2 mt-3 font-normal text-health-muted">{ev.roundLive.title}</p>
            </>
          ) : (
            <h1 className="health-hero-name mt-4 text-[48px]">Ожидание раунда</h1>
          )}
        </div>
        <TimerRing
          large
          remainingMs={ev.timers.speech.remainingMs}
          totalSec={ev.timers.speech.totalSec}
          running={ev.timers.speech.running}
          label="Выступление"
          accent="var(--health-orange)"
        />
      </div>
    </HealthCanvas>
  );
}