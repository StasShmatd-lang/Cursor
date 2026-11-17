import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { EventStateHost } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { hostAction } from "../lib/api";
import { TimerRing } from "../components/TimerRing";
import { ScoreTrack } from "../components/ScoreTrack";
import { AspectMetricCard } from "../components/AspectMetricCard";
import { DEFAULT_ASPECT_TITLES } from "../constants/aspects";
import { HealthCanvas, HealthCard, HealthNavBar, HealthSection } from "../ui/HealthLayout";
import { formatScore } from "../lib/formatScore";

type Tab = "people" | "round" | "timers" | "links";

type Creds = { id: string; hostKey: string; voteKey: string };

const CREDS_KEY = "voting-host";

function readCreds(): Creds | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromHash = credsFrom(hash.get("e"), hash.get("h"), hash.get("v"));
  if (fromHash) return fromHash;
  if (hash.has("e") || hash.has("h") || hash.has("v")) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(CREDS_KEY) ?? "null") as Partial<Creds> | null;
    return credsFrom(parsed?.id, parsed?.hostKey, parsed?.voteKey);
  } catch {
    return null;
  }
}

function credsFrom(id?: string | null, hostKey?: string | null, voteKey?: string | null): Creds | null {
  if (!id || !hostKey || !voteKey) return null;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null;
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(hostKey) || !/^[A-Za-z0-9_-]{20,128}$/.test(voteKey)) return null;
  return { id, hostKey, voteKey };
}

function saveCreds(creds: Creds) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  const hash = new URLSearchParams({ e: creds.id, h: creds.hostKey, v: creds.voteKey });
  window.history.replaceState(null, "", `/#${hash.toString()}`);
}

export function HostPage() {
  const [booted, setBooted] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCreds(readCreds());
    setBooted(true);
  }, []);

  const { state: ev, error: liveError, reload } = useEventSocket<EventStateHost>(
    creds?.id,
    "host",
    creds?.hostKey,
  );

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setHostError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json()) as { error?: string; id?: string; hostKey?: string; voteKey?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      const next = credsFrom(data.id, data.hostKey, data.voteKey);
      if (!next) throw new Error("Не удалось открыть событие");
      saveCreds(next);
      setCreds(next);
    } catch (err) {
      setHostError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  }

  async function act(action: string, payload: Record<string, unknown>) {
    if (!creds || busy) return false;
    setBusy(true);
    setHostError("");
    try {
      await hostAction(creds.id, creds.hostKey, { action, ...payload });
      reload();
      return true;
    } catch (err) {
      setHostError(err instanceof Error ? err.message : "Ошибка");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    localStorage.removeItem(CREDS_KEY);
    window.history.replaceState(null, "", "/");
    setCreds(null);
    setHostError("");
  }

  if (!booted || (creds && !ev && !liveError)) {
    return (
      <HealthCanvas laptop>
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-body text-health-muted">Загрузка…</p>
        </div>
      </HealthCanvas>
    );
  }

  if (!creds || !ev) {
    return (
      <HealthCanvas laptop>
        <div className="flex min-h-[80vh] flex-col justify-center max-w-xl mx-auto">
          <form onSubmit={createEvent} className="health-stack">
            <HealthNavBar eyebrow="Старт" title="Новое событие" />
            <HealthCard className="space-y-5">
              <p className="text-callout text-health-muted">
                Управление с телефона или ноутбука. Ссылки жюри и зала появятся после создания.
              </p>
              <HealthSection label="Название">
                <input className="health-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </HealthSection>
              {(hostError || liveError) && (
                <p className="text-footnote font-medium text-[var(--health-pink)]">{hostError || liveError}</p>
              )}
              <button type="submit" className="health-btn" disabled={creating}>
                Создать
              </button>
            </HealthCard>
          </form>
        </div>
      </HealthCanvas>
    );
  }

  const origin = window.location.origin;
  const guestUrl = `${origin}/vote/${ev.id}#k=${encodeURIComponent(creds.voteKey)}`;
  const screenUrl = `${origin}/screen/${ev.id}`;
  const prepUrl = `${origin}/prep/${ev.id}`;
  const hostUrl = `${origin}/#e=${encodeURIComponent(creds.id)}&h=${encodeURIComponent(creds.hostKey)}&v=${encodeURIComponent(creds.voteKey)}`;

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

        {hostError && (
          <p className="mb-4 text-footnote font-medium text-[var(--health-pink)]">{hostError}</p>
        )}

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
                disabled={busy}
                onClick={() => {
                  void act("add-participant", { name: pName, company: pCompany }).then((ok) => {
                    if (ok) {
                      setPName("");
                      setPCompany("");
                    }
                  });
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
              disabled={!selectedParticipant || busy}
              onClick={() => void act("set-round", {
                participantId: selectedParticipant,
                title: roundTitle,
                aspects: aspectInputs,
              })}
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
                          onClick={() => void act("switch-round", { roundId: r.id })}
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
              disabled={busy}
              onClick={() =>
                void act("timer-config", {
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
                  <TinyBtn onClick={() => void act("speech-timer", { step: "start" })}>Старт</TinyBtn>
                  <TinyBtn onClick={() => void act("speech-timer", { step: "pause" })}>Пауза</TinyBtn>
                  <TinyBtn onClick={() => void act("speech-timer", { step: "reset" })}>Сброс</TinyBtn>
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
                  <TinyBtn onClick={() => void act("rating-timer", { step: "start" })}>Старт</TinyBtn>
                  <TinyBtn onClick={() => void act("rating-timer", { step: "pause" })}>Пауза</TinyBtn>
                  <TinyBtn onClick={() => void act("rating-timer", { step: "reset" })}>Сброс</TinyBtn>
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
              <p className="health-section-label mb-3">Жюри (телефон)</p>
              <div className="mx-auto inline-block bg-white p-3">
                <QRCodeSVG
                  value={guestUrl}
                  size={168}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-footnote mt-4 break-all text-health-muted">{guestUrl}</p>
            </div>
            <div className="health-divider pt-6 text-left">
              <p className="health-section-label mb-2">Экран зала</p>
              <p className="text-subhead break-all font-medium text-health-text">{screenUrl}</p>
              <p className="text-footnote mt-2 text-health-muted">
                Откройте эту ссылку в браузере проектора. До первой оценки — заставка, затем живые баллы, после
                закрытия голосования — разбор по жюри.
              </p>
            </div>
            <div className="health-divider pt-6 text-left">
              <p className="health-section-label mb-2">Ноутбук спикера</p>
              <p className="text-subhead break-all font-medium text-health-text">{prepUrl}</p>
            </div>
            <div className="health-divider pt-6 text-left">
              <p className="health-section-label mb-2">Ссылка ведущего</p>
              <p className="text-footnote break-all text-health-muted">{hostUrl}</p>
              <p className="text-footnote mt-2 text-health-muted">
                Сохраните её себе. В зал и жюри её не отправляйте.
              </p>
              <button type="button" className="health-btn-secondary mt-4" onClick={forget}>
                Новое событие
              </button>
            </div>
          </HealthCard>
        )}
      </div>
    </HealthCanvas>
  );
}

function TinyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="health-btn-secondary px-3 py-2 text-footnote">
      {children}
    </button>
  );
}
