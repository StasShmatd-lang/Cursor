export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function readJson(
  request: Request,
  max = 8000,
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: Response }> {
  const text = await request.text();
  if (text.length > max) {
    return { ok: false, response: json({ error: "Слишком большой запрос" }, 413) };
  }
  const type = request.headers.get("content-type") ?? "";
  if (text && !type.toLowerCase().includes("application/json")) {
    return { ok: false, response: json({ error: "Ожидается JSON" }, 415) };
  }
  if (!text) return { ok: true, value: {} };
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, response: json({ error: "Ожидается объект" }, 400) };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, response: json({ error: "Некорректный JSON" }, 400) };
  }
}

export function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,128})$/.exec(header);
  return match?.[1] ?? "";
}

export function logSafe(error: unknown) {
  const message = error instanceof Error ? error.message : "error";
  if (/postgres:\/\//i.test(message) || /database_url/i.test(message)) {
    console.error("database error");
    return;
  }
  console.error(message);
}
