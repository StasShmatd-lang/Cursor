import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { EventStateGuest } from "../types";
import { getSocket } from "../socket";
import { useEventSocket } from "../hooks/useEventSocket";
import { TimerRing } from "../components/TimerRing";
import { AspectVoteSection } from "../components/AspectVoteSection";
import { ASPECT_COLORS } from "../constants/aspects";
import { HealthCanvas, HealthCard, HealthNavBar, HealthSection } from "../ui/HealthLayout";
import { formatScore } from "../lib/formatScore";

export function GuestPage() {
  const { pollId: eventId } = useParams<{ pollId: string }>();
  const { state: ev, error: loadError } = useEventSocket<EventStateGuest>(eventId, "guest");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [scores, setScores] = useState<(number | null)[]>([null, null, null]);
  const [rateError, setRateError] = useState("");
  const [done, setDone] = useState(false);

  const aspectMeta = useMemo(() => {
    const rl = ev?.roundLive;
    if (!rl) return [];
    return (rl.aspects?.length ? rl.aspects : rl.aspectTitles.map((title, id) => ({
      id,
      title,
      color: ASPECT_COLORS[id],
      average: 0,
    }))).slice(0, 3);
  }, [ev?.roundLive]);

  useEffect(() => {
    setScores([null, null, null]);
  }, [ev?.roundLive?.id]);

  useEffect(() => {
    const socket = getSocket();
    const onErr = (p: { message: string }) => setRateError(p.message);
    const onOk = () => {
      setDone(true);
      setRateError("");
    };
    socket.on("rate-error", onErr);
    socket.on("rate-success", onOk);
    return () => {
      socket.off("rate-error", onErr);
      socket.off("rate-success", onOk);
    };
  }, []);

  function submit() {
    if (!eventId || scores.some((s) => s === null)) return;
    setRateError("");
    getSocket().emit("guest:rate", {
      eventId,
      name,
      company,
      scores: scores as number[],
    });
  }

  if (loadError) {
    return (
      <HealthCanvas>
        <div className="flex min-h-[70vh] items-center justify-center text-center">
          <p className="text-title-2 text-[var(--health-pink)]">{loadError}</p>
        </div>
      </HealthCanvas>
    );
  }

  if (!ev) {
    return (
      <HealthCanvas>
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-body text-health-muted">Загрузка…</p>
        </div>
      </HealthCanvas>
    );
  }

  if (done) {
    return (
      <HealthCanvas>
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
          <h1 className="text-title-1">Спасибо!</h1>
          <p className="text-callout text-health-muted">Три оценки учтены</p>
          <div className="grid w-full gap-3">
            {aspectMeta.map((a, i) => (
              <div key={a.id} className="health-card-inset flex justify-between px-4 py-3">
                <span className="text-subhead font-semibold" style={{ color: a.color }}>
                  {a.title}
                </span>
                <span className="text-headline font-bold tabular-nums" style={{ color: a.color }}>
                  {scores[i] != null ? formatScore(scores[i]!) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </HealthCanvas>
    );
  }

  const needProfile = !name.trim() || !company.trim();
  const scoresReady = scores.every((s) => s !== null);

  return (
    <HealthCanvas>
      <HealthNavBar eyebrow="Жюри" title={ev.title} />
      <div className="health-stack">
        <HealthSection label="Сейчас">
          {ev.roundLive ? (
            <div className="health-live-hero space-y-4">
              <p className="health-hero-name">{ev.roundLive.participantName}</p>
              <p className="text-callout text-health-muted">{ev.roundLive.title}</p>
              <div className="flex justify-between gap-3">
                <TimerRing
                  remainingMs={ev.timers.speech.remainingMs}
                  totalSec={ev.timers.speech.totalSec}
                  running={ev.timers.speech.running}
                  label="Выступление"
                  accent="var(--health-orange)"
                />
                <TimerRing
                  remainingMs={ev.timers.rating.remainingMs}
                  totalSec={ev.timers.rating.totalSec}
                  running={ev.timers.rating.running}
                  label="Оценка"
                  accent="var(--health-lime)"
                />
              </div>
            </div>
          ) : (
            <HealthCard>
              <p className="text-callout text-center text-health-muted">Ожидаем следующий раунд…</p>
            </HealthCard>
          )}
        </HealthSection>

        <HealthSection label="Жюри">
          <HealthCard className="space-y-3">
            <input
              className="health-input"
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <input
              className="health-input"
              placeholder="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
            />
          </HealthCard>
        </HealthSection>

        <HealthSection label="Три аспекта выступления">
          {!ev.ratingOpen ? (
            <HealthCard>
              <p className="text-callout text-center text-health-muted">
                Окно оценки закрыто — дождитесь сигнала ведущего
              </p>
            </HealthCard>
          ) : (
            <HealthCard className="space-y-4">
              {aspectMeta.map((aspect, i) => (
                <AspectVoteSection
                  key={aspect.id}
                  aspect={aspect}
                  value={scores[i]}
                  onChange={(v) =>
                    setScores((prev) => prev.map((s, idx) => (idx === i ? v : s)))
                  }
                />
              ))}
              {rateError && (
                <p className="text-footnote text-center font-medium text-[var(--health-pink)]">{rateError}</p>
              )}
              <button
                type="button"
                className="health-btn"
                disabled={needProfile || !scoresReady}
                onClick={submit}
              >
                Отправить три оценки
              </button>
            </HealthCard>
          )}
        </HealthSection>
      </div>
    </HealthCanvas>
  );
}