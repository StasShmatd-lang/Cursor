import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { EventStateHost } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { getSocket } from "../socket";
import { TimerRing } from "../components/TimerRing";
import { ScoreTrack } from "../components/ScoreTrack";
import { AspectMetricCard } from "../components/AspectMetricCard";
import { DEFAULT_ASPECT_TITLES } from "../constants/aspects";
import { HealthCanvas, HealthCard, HealthNavBar, HealthSection } from "../ui/HealthLayout";
import { formatScore } from "../lib/formatScore";

type Tab = "people" | "round" | "timers" | "links";

export function HostPage() {
  const [event, setEvent] = useState<EventStateHost | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("День питчей");
  const [tab, setTab] = useState<Tab>("people");
  const [pName, setPName] = useState("");
  const [pCompany, setPCompany] = useState("");
  const [roundTitle, setRoundTitle] = useState("Питч");
  const [aspectInputs, setAspectInputs] = useState<string[]>([...DEFAULT_ASPECT_TITLES]);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [speechMin, setSpeechMin] = useState("5");
  const [ratingMin, setRatingMin] = useState("2");
  const [hostError, setHostError] = useState("");

  const { state: live } = useEventSocket<EventStateHost>(event?.id, "host");
  const ev = live ?? event;

  const origin = useMemo(() => window.location.origin, []);
  const guestUrl = useMemo(() => (ev ? `${origin}/vote/${ev.id}` : ""), [ev, origin]);
  const screenPath = useMemo(() => (ev ? `/screen/${ev.id}` : ""), [ev]);
  const screenUrl = useMemo(() => (ev ? `${origin}${screenPath}` : ""), [ev, origin, screenPath]);
  const prepUrl = useMemo(() => (ev ? `${origin}/prep/${ev.id}` : ""), [ev, origin]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setEvent(data);
    } catch (err) {
      setHostError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  }

  function emit(action: string, payload: Record<string, unknown>) {
    if (!ev) return;
    getSocket().emit(action, { eventId: ev.id, ...payload });
  }

  if (!ev) {
    return (
      <HealthCanvas laptop>
        <div className="flex min-h-[80vh] flex-col justify-center max-w-xl mx-auto">
          <form onSubmit={createEvent} className="health-stack">
            <HealthNavBar eyebrow="Старт" title="Новое событие" />
            <HealthCard className="space-y-5">
              <p className="text-callout text-health-muted">Управление с телефона или ноутбука</p>
              <HealthSection label="Название">
                <input className="health-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </HealthSection>
              {hostError && <p className="text-footnote font-medium text-[var(--health-pink)]">{hostError}</p>}
              <button type="submit" className="health-btn" disabled={creating}>
                Создать
              </button>
            </HealthCard>
          </form>
        </div>
      </HealthCanvas>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "people", label: "Участники" },
    { id: "round", label: "Раунд" },
    { id: "timers", label: "Таймеры" },
    { id: "links", label: "Ссылки" },
  ];

  return (
    <HealthCanvas laptop>
      <div className="health-laptop-center">
        <div className="w-full max-w-5xl text-center lg:text-left">
          <HealthNavBar eyebrow="Ведущий" title={ev.title} />
        </div>

        {ev.roundLive && (
          <section className="mb-6 grid w-full max-w-4xl gap-5 lg:grid-cols-[minmax(240px,1fr)_1.6fr] lg:items-center lg:gap-8">
            <div className="health-live-hero text-center lg:text-left">
              <p className="health-section-label">Сейчас в эфире</p>
              <p className="health-hero-name mt-1">{ev.roundLive.participantName}</p>
              <p className="health-hero-subtitle mt-2 text-[20px] font-semibold leading-tight">
                {ev.roundLive.title}
              </p>
              <p className="text-footnote mt-3">
                <span className="font-semibold" style={{ color: "var(--health-lime)" }}>
                  {ev.roundLive.ratingsCount}
                </span>
                <span className="text-health-muted"> голосов жюри · сумма </span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--health-orange)" }}>
                  {formatScore(ev.roundLive.average)}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ev.roundLive.aspects.map((a) => (
                <AspectMetricCard key={a.id} aspect={a} compact />
              ))}
            </div>
          </section>
        )}

        <nav className="health-segment mb-5 w-full max-w-5xl justify-center">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`health-segment-btn ${tab === t.id ? "health-segment-btn-active" : "health-segment-btn-idle"}`}
          >
            {t.label}
          </button>
        ))}
        </nav>

        {tab === "people" && (
        <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <HealthCard className="space-y-3 text-left">
            <p className="health-section-label text-center">Добавить участника</p>
            <input
              className="health-input"
              placeholder="Имя"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
            />
            <input
              className="health-input"
              placeholder="Компания"
              value={pCompany}
              onChange={(e) => setPCompany(e.target.value)}
            />
            <button
              type="button"
              className="health-btn"
              onClick={() => {
                getSocket().emit("host:add-participant", {
                  eventId: ev.id,
                  name: pName,
                  company: pCompany,
                });
                setPName("");
                setPCompany("");
              }}
            >
              Добавить
            </button>
          </HealthCard>
          <div className="w-full space-y-3">
            {ev.participants.length === 0 ? (
              <p className="text-callout text-center text-health-muted">Пока нет участников</p>
            ) : (
              ev.participants.map((p) => (
                <ScoreTrack key={p.id} name={p.name} company={p.company} total={p.totalScore} track={p.scoreTrack} />
              ))
            )}
          </div>
        </section>
        )}

        {tab === "round" && (
        <HealthCard className="w-full max-w-2xl space-y-4">
          <p className="health-section-label">Раунд и три аспекта</p>
          <input
            className="health-input"
            value={roundTitle}
            onChange={(e) => setRoundTitle(e.target.value)}
            placeholder="Название раунда"
          />
          <select
            className="health-select"
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
          >
            <option value="">Кто выступает</option>
            {ev.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {aspectInputs.map((label, i) => (
            <input
              key={i}
              className="health-input"
              value={label}
              onChange={(e) =>
                setAspectInputs((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
              }
              placeholder={`Аспект ${i + 1}`}
              style={{ borderLeft: `3px solid var(--health-${i === 0 ? "purple" : i === 1 ? "pink" : "cyan"})` }}
            />
          ))}
          <button
            type="button"
            className="health-btn"
            disabled={!selectedParticipant}
            onClick={() =>
              getSocket().emit("host:set-round", {
                eventId: ev.id,
                participantId: selectedParticipant,
                title: roundTitle,
                aspects: aspectInputs,
              })
            }
          >
            Начать раунд
          </button>

          {ev.rounds.length > 0 && (
            <div className="health-divider pt-4">
              <p className="mb-3 text-[13px] font-semibold text-health-muted">Другие раунды в событии</p>
              <ul className="space-y-2">
                {ev.rounds.map((r) => {
                  const person = ev.participants.find((p) => p.id === r.participantId);
                  const active = r.id === ev.currentRoundId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`w-full rounded-[14px] px-4 py-3.5 text-left text-subhead font-medium ${
                          active
                            ? "bg-[var(--health-blue)] text-white"
                            : "bg-health-elevated text-health-text"
                        }`}
                        onClick={() =>
                          getSocket().emit("host:switch-round", { eventId: ev.id, roundId: r.id })
                        }
                      >
                        {person?.name}: {r.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

        </HealthCard>
      )}

        {tab === "timers" && (
        <HealthCard className="w-full max-w-3xl">
            <p className="health-section-label mb-4">Длительность (мин)</p>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="text-[13px] text-health-muted">
                Выступление
                <input
                  className="health-input mt-1"
                  value={speechMin}
                  onChange={(e) => setSpeechMin(e.target.value)}
                />
              </label>
              <label className="text-[13px] text-health-muted">
                Оценка
                <input
                  className="health-input mt-1"
                  value={ratingMin}
                  onChange={(e) => setRatingMin(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              className="health-btn-secondary mb-6 w-full"
              onClick={() =>
                getSocket().emit("host:timer-config", {
                  eventId: ev.id,
                  speechSec: Number(speechMin) * 60,
                  ratingSec: Number(ratingMin) * 60,
                })
              }
            >
              Применить
            </button>
            <div className="flex justify-around gap-4">
              <div className="flex flex-col items-center gap-3">
                <TimerRing
                  remainingMs={ev.timers.speech.remainingMs}
                  totalSec={ev.timers.speech.totalSec}
                  running={ev.timers.speech.running}
                  label="Выступление"
                  accent="var(--health-orange)"
                />
                <div className="flex gap-2">
                  <TinyBtn onClick={() => emit("host:speech-timer", { action: "start" })}>Старт</TinyBtn>
                  <TinyBtn onClick={() => emit("host:speech-timer", { action: "pause" })}>Пауза</TinyBtn>
                  <TinyBtn onClick={() => emit("host:speech-timer", { action: "reset" })}>Сброс</TinyBtn>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <TimerRing
                  remainingMs={ev.timers.rating.remainingMs}
                  totalSec={ev.timers.rating.totalSec}
                  running={ev.timers.rating.running}
                  label="Оценка"
                  accent="var(--health-green)"
                />
                <div className="flex gap-2">
                  <TinyBtn onClick={() => emit("host:rating-timer", { action: "start" })}>Старт</TinyBtn>
                  <TinyBtn onClick={() => emit("host:rating-timer", { action: "pause" })}>Пауза</TinyBtn>
                  <TinyBtn onClick={() => emit("host:rating-timer", { action: "reset" })}>Сброс</TinyBtn>
                </div>
              </div>
            </div>
            <p className="text-callout mt-6 text-center text-health-muted">
              {ev.ratingOpen ? "Гости могут ставить оценки" : "Окно оценки закрыто"}
            </p>
        </HealthCard>
        )}

        {tab === "links" && (
        <HealthCard className="w-full max-w-xl space-y-6 text-center">
          <div>
            <p className="health-section-label mb-3">Гости (телефон)</p>
            <QRCodeSVG value={guestUrl} size={168} level="M" className="mx-auto rounded-[var(--health-radius)]" />
            <p className="text-footnote mt-4 break-all text-health-muted">{guestUrl}</p>
          </div>
          <div className="health-divider pt-6 text-left">
            <p className="health-section-label mb-2">Экран зала (проектор)</p>
            <p className="text-footnote mb-3 text-health-muted">
              В браузере проектора откройте путь <span className="font-medium text-health-text">{screenPath}</span> на
              том же хосте, где крутится это приложение (полный URL:{" "}
              <span className="break-all">{screenUrl}</span>). До первой оценки — заставка, затем живые баллы, после
              закрытия голосования — разбор по жюри.
            </p>
          </div>
          {prepUrl && (
            <div className="health-divider pt-6">
              <p className="health-section-label mb-2">Ноутбук спикера</p>
              <p className="text-subhead break-all font-medium text-health-text">{prepUrl}</p>
            </div>
          )}
        </HealthCard>
        )}
      </div>
    </HealthCanvas>
  );
}

function TinyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="health-btn-secondary px-3 py-2 text-footnote"
    >
      {children}
    </button>
  );
}