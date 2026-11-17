import { guestRate, validId } from "@/src/lib/events";
import { json, logSafe, readJson } from "@/src/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return json({ error: "Событие не найдено" }, 404);
  const body = await readJson(request);
  if (!body.ok) return body.response;
  try {
    const result = await guestRate(id, body.value);
    if (result.status !== 200) return json({ error: result.error }, result.status);
    return json(result.event);
  } catch (error) {
    logSafe(error);
    return json({ error: "Не удалось сохранить оценку" }, 500);
  }
}
