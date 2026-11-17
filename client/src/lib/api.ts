export async function hostAction(eventId: string, hostKey: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/host`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${hostKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить");
  return data;
}
