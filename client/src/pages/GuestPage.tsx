import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { EventStateGuest } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { TimerRing } from "../components/TimerRing";
import { AspectVoteSection } from "../components/AspectVoteSection";
import { ASPECT_COLORS } from "../constants/aspects";
import { HealthCanvas, HealthCard, HealthNavBar, HealthSection } from "../ui/HealthLayout";
import { formatScore } from "../lib/formatScore";
import { guestProfileKey, votedKey } from "../lib/device";

export function GuestPage() {
  const { pollId: eventId } = useParams<{ pollId: string }>();
  const { state: ev, error: loadError } = useEventSocket<EventStateGuest>(eventId, "guest");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [scores, setScores] = useState<(number | null)[]>([null, null, null]);
  const [rateError, setRateError] = useState("");
  const [done, setDone] = useState(false);
  const [voteKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("k") ?? "";
  });
  const [profileFor, setProfileFor] = useState<string | null>(null);
  if (eventId && eventId !== profileFor) {
    setProfileFor(eventId);
    try {
      const saved = JSON.parse(localStorage.getItem(guestProfileKey(eventId)) ?? "null") as {
        name?: string;
        company?: string;
      } | null;
      setName(saved?.name ?? "");
      setCompany(saved?.company ?? "");
    } catch {
      setName("");
      setCompany("");
    }
  }

  useEffect(() => {
    if (!eventId || profileFor !== eventId) return;
    localStorage.setItem(guestProfileKey(eventId), JSON.stringify({ name, company }));
  }, [eventId, profileFor, name, company]);

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
    if (!eventId || !ev?.roundLive?.id) return;
    setDone(localStorage.getItem(votedKey(eventId, ev.roundLive.id)) === "1");
    setRateError("");
  }, [eventId, ev?.roundLive?.id]);

  async function submit() {
    if (!eventId || !voteKey || scores.some((s) => s === null)) return;
    setRateError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/rate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voteKey, name, company, scores, roundId: ev?.roundLive?.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRateError(data.error ?? "Не удалось отправить");
        return;
      }
      if (ev?.roundLive?.id) localStorage.setItem(votedKey(eventId, ev.roundLive.id), "1");
      setDone(true);
    } catch {
      setRateError("Не удалось отправить");
    }
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

  if (!voteKey) {
    return (
      <HealthCanvas>
        <div className="flex min-h-[70vh] items-center justify-center text-center">
          <p className="text-title-2">Откройте ссылку или QR от ведущего</p>
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
              <p className="text-footnote text-center text-health-muted">
                {ev.timers.speech.running
                  ? "Можно оценивать во время выступления"
                  : ev.timers.rating.running
                    ? "Дополнительное время на оценку"
                    : "Окно оценки открыто"}
              </p>
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