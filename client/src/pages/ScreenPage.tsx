import { useParams } from "react-router-dom";
import type { EventStateScreen } from "../types";
import { useEventSocket } from "../hooks/useEventSocket";
import { HealthCanvas } from "../ui/HealthLayout";
import { BroadcastView } from "../components/BroadcastView";

export function ScreenPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { state: ev, error } = useEventSocket<EventStateScreen>(eventId, "screen");

  if (error) {
    return (
      <HealthCanvas stage>
        <p className="text-title-1 text-[var(--health-pink)]">{error}</p>
      </HealthCanvas>
    );
  }

  if (!ev) {
    return (
      <HealthCanvas stage>
        <p className="text-title-2 text-health-muted">Подключение…</p>
      </HealthCanvas>
    );
  }

  return (
    <HealthCanvas stage>
      <BroadcastView ev={ev} ring />
    </HealthCanvas>
  );
}