export type SavedEvent = {
  id: string;
  hostKey: string;
  voteKey: string;
  title: string;
};

const LIST_KEY = "voting-host-events";
const LEGACY_KEY = "voting-host";

function validCreds(id?: string | null, hostKey?: string | null, voteKey?: string | null) {
  if (!id || !hostKey || !voteKey) return false;
  return (
    /^[A-Za-z0-9_-]{8,32}$/.test(id) &&
    /^[A-Za-z0-9_-]{20,128}$/.test(hostKey) &&
    /^[A-Za-z0-9_-]{20,128}$/.test(voteKey)
  );
}

export function readSavedEvents(): SavedEvent[] {
  const raw = readList();
  const legacy = readLegacy();
  if (legacy && !raw.some((item) => item.id === legacy.id)) raw.unshift(legacy);
  return raw;
}

export function rememberEvent(event: SavedEvent) {
  const next = [event, ...readSavedEvents().filter((item) => item.id !== event.id)].slice(0, 20);
  localStorage.setItem(LIST_KEY, JSON.stringify(next));
  localStorage.removeItem(LEGACY_KEY);
}

export function hashCreds(): SavedEvent | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const id = hash.get("e");
  const hostKey = hash.get("h");
  const voteKey = hash.get("v");
  if (!validCreds(id, hostKey, voteKey)) return null;
  const known = readSavedEvents().find((item) => item.id === id);
  return { id: id!, hostKey: hostKey!, voteKey: voteKey!, title: known?.title || "Событие" };
}

export function eventUrl(event: SavedEvent) {
  const hash = new URLSearchParams({ e: event.id, h: event.hostKey, v: event.voteKey });
  return `/#${hash.toString()}`;
}

export function guestProfileKey(eventId: string) {
  return `voting-guest:${eventId}`;
}

export function votedKey(eventId: string, roundId: string) {
  return `voting-voted:${eventId}:${roundId}`;
}

export function hostDraftKey(eventId: string) {
  return `voting-host-draft:${eventId}`;
}

function readList(): SavedEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSaved);
  } catch {
    return [];
  }
}

function readLegacy(): SavedEvent | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null") as Partial<SavedEvent> | null;
    if (!parsed || !validCreds(parsed.id, parsed.hostKey, parsed.voteKey)) return null;
    return { id: parsed.id!, hostKey: parsed.hostKey!, voteKey: parsed.voteKey!, title: parsed.title || "Событие" };
  } catch {
    return null;
  }
}

function isSaved(value: unknown): value is SavedEvent {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedEvent>;
  return validCreds(item.id, item.hostKey, item.voteKey);
}
