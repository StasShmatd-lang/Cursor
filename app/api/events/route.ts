import { createEvent } from "@/src/lib/events";
import { json, logSafe, readJson } from "@/src/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  try {
    const created = await createEvent(body.value.title);
    if ("error" in created) return json({ error: created.error }, 429);
    return json({ ...created.event, hostKey: created.hostKey, voteKey: created.voteKey });
  } catch (error) {
    logSafe(error);
    return json({ error: "Не удалось создать событие" }, 500);
  }
}
