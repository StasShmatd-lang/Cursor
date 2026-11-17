import { useEffect, useState } from "react";
import type { TimerState } from "../types";

type Timed = {
  timers: { speech: TimerState; rating?: TimerState };
};

function projectState<T>(state: T, receivedAt: number, now: number): T {
  if (!state || typeof state !== "object" || !("timers" in state)) return state;
  const timers = (state as Timed).timers;
  const dt = Math.max(0, now - receivedAt);
  const project = (timer?: TimerState) => {
    if (!timer) return timer;
    if (!timer.running) return timer;
    const remainingMs = Math.max(0, timer.remainingMs - dt);
    return { ...timer, remainingMs, running: remainingMs > 0 };
  };
  const nextTimers: Timed["timers"] = { speech: project(timers.speech) ?? timers.speech };
  if (timers.rating) nextTimers.rating = project(timers.rating);
  return { ...(state as object), timers: nextTimers } as T;
}

export function useEventSocket<T>(
  eventId: string | undefined,
  role: "host" | "guest" | "screen" | "prep",
  hostKey?: string,
) {
  const [snap, setSnap] = useState<{ state: T; at: number } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    if (role === "host" && !hostKey) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const headers: Record<string, string> = {};
        if (hostKey) headers.authorization = `Bearer ${hostKey}`;
        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}?role=${role}`, {
          headers,
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) setError(data.error ?? "Событие не найдено");
          return;
        }
        setError("");
        setSnap({ state: data as T, at: Date.now() });
      } catch {
        /* keep the last snapshot when the network blips */
      }
    };
    void pull();
    const id = setInterval(() => void pull(), 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventId, role, hostKey, reloadToken]);

  useEffect(() => {
    if (!eventId) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [eventId]);

  const state = snap ? projectState(snap.state, snap.at, now) : null;
  return { state, error, reload: () => setReloadToken((token) => token + 1) };
}
