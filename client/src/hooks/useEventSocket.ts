import { useEffect, useState } from "react";
import { getSocket } from "../socket";

export function useEventSocket<T>(
  eventId: string | undefined,
  role: "host" | "guest" | "screen" | "prep",
) {
  const [state, setState] = useState<T | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    const socket = getSocket();
    const onState = (s: T) => setState(s);
    const onErr = (p: { message: string }) => setError(p.message);
    socket.emit("join-event", { eventId, role });
    socket.on("event-state", onState);
    socket.on("event-error", onErr);
    socket.on("host-error", onErr);
    return () => {
      socket.off("event-state", onState);
      socket.off("event-error", onErr);
      socket.off("host-error", onErr);
    };
  }, [eventId, role]);

  return { state, setState, error, socket: getSocket() };
}