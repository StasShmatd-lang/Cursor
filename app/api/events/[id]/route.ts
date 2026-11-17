import { readEvent, validId, type Role } from "@/src/lib/events";
import { bearer, json, logSafe } from "@/src/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = new Set<Role>(["host", "guest", "screen", "prep"]);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return json({ error: "Событие не найдено" }, 404);
  const requested = new URL(request.url).searchParams.get("role") ?? "guest";
  const role: Role = ROLES.has(requested as Role) ? (requested as Role) : "guest";
  try {
    const result = await readEvent(id, role, bearer(request));
    if (result.status !== 200) return json({ error: result.error }, result.status);
    return json(result.event);
  } catch (error) {
    logSafe(error);
    return json({ error: "Не удалось открыть событие" }, 500);
  }
}
