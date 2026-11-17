import { hostAction, validId } from "@/src/lib/events";
import { bearer, json, logSafe, readJson } from "@/src/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return json({ error: "Событие не найдено" }, 404);
  const hostKey = bearer(request);
  if (!hostKey) return json({ error: "Ссылка ведущего не подходит" }, 401);
  const body = await readJson(request);
  if (!body.ok) return body.response;
  try {
    const result = await hostAction(id, hostKey, body.value);
    if (result.status !== 200) return json({ error: result.error }, result.status);
    return json(result.event);
  } catch (error) {
    logSafe(error);
    return json({ error: "Не удалось сохранить" }, 500);
  }
}
