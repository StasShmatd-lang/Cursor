import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EventStateScreen, JuryRatingRow, LeaderboardRow } from "../types";
import { ActivityRings, activityRingsFromAspects } from "./ActivityRings";
import { formatScore } from "../lib/formatScore";

const FRAME = 44;
const GAP = 8;

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

function useCapacity(mode: "stack" | "grid") {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const columns =
    mode === "stack" || box.width <= 0 ? 1 : Math.max(1, Math.floor((box.width + GAP) / (148 + GAP)));
  const rows = box.height <= 0 ? 12 : Math.max(1, Math.floor((box.height + GAP) / (FRAME + GAP)));
  return { ref, columns, rows, capacity: columns * rows };
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
            <ActivityRings size={148} rings={rings} />
            <p className="cast-ring-score">{ev.roundLive ? formatScore(ev.roundLive.average) : "—"}</p>
          </section>
        ) : null}
        <TopList rows={ev.leaderboard} currentId={ev.roundLive?.participantId ?? null} />
        <JuryBoard rows={jury} />
      </div>
    </div>
  );
}

function FrameList<T>({
  mode,
  items,
  render,
}: {
  mode: "stack" | "grid";
  items: T[];
  render: (item: T) => ReactNode;
}) {
  const { ref, columns, rows, capacity } = useCapacity(mode);
  const [open, setOpen] = useState(false);
  const overflow = items.length > capacity;
  const hiddenSlots = rows <= 1 ? Math.max(1, columns - 1) : (rows - 1) * columns;
  const visible = open || !overflow ? items.length : hiddenSlots;
  const className = `${mode === "grid" ? "cast-jury" : "cast-top-list"} cast-panel-body${open ? " is-open" : ""}`;
  return (
    <div
      ref={ref}
      className={className}
      style={mode === "grid" ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {items.slice(0, visible).map(render)}
      {overflow ? (
        <button type="button" className="cast-frame cast-more" onClick={() => setOpen((value) => !value)}>
          {open ? "свернуть" : "···"}
        </button>
      ) : null}
    </div>
  );
}

function TopList({ rows, currentId }: { rows: LeaderboardRow[]; currentId: string | null }) {
  return (
    <section className="cast-panel health-card-pad">
      <div className="cast-panel-label">
        <p className="health-section-label">Топ участников</p>
        <p className="text-footnote tabular-nums text-health-muted">{rows.length}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-footnote text-health-muted">Имена появятся, когда ведущий добавит участников</p>
      ) : (
        <FrameList
          mode="stack"
          items={rows}
          render={(row) => (
            <div key={row.id} className="cast-frame">
              <span className="cast-rank">{row.rank}</span>
              <p className="cast-person min-w-0 flex-1">
                {row.name}
                {row.id === currentId ? <span className="cast-now"> сейчас</span> : null}
              </p>
              <span className="cast-score">{row.totalScore > 0 ? formatScore(row.totalScore) : "—"}</span>
            </div>
          )}
        />
      )}
    </section>
  );
}

function JuryBoard({ rows }: { rows: JuryRatingRow[] }) {
  return (
    <section className="cast-panel health-card-pad">
      <div className="cast-panel-label">
        <p className="health-section-label">Проголосовали</p>
        <p className="text-footnote tabular-nums text-health-muted">{rows.length}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-footnote text-health-muted">Имена появятся, когда жюри отправит оценки</p>
      ) : (
        <FrameList
          mode="grid"
          items={rows}
          render={(row) => (
            <div key={`${row.name}-${row.company}`} className="cast-frame">
              <p className="cast-person min-w-0 flex-1">{row.name}</p>
              <span className="cast-score">{formatScore(row.total)}</span>
            </div>
          )}
        />
      )}
    </section>
  );
}
