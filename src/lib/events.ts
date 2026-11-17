import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { withTx } from "./db";

const DEFAULT_ASPECT_TITLES = ["Подача", "Содержание", "Убедительность"];
const ASPECT_COLORS = ["#BF5AF2", "#FF375F", "#64D2FF"];
const MAX_EVENTS = 300;
const MAX_PARTICIPANTS = 80;
const MAX_ROUNDS = 100;
const MAX_RATINGS = 400;

export type Role = "host" | "guest" | "screen" | "prep";

type Timer = {
  totalSec: number;
  remainingMs: number;
  running: boolean;
  startedAt: number | null;
};

type Aspect = { id: number; title: string; color: string };

type Rating = { key: string; name: string; company: string; scores: number[] };

type Round = {
  id: string;
  title: string;
  participantId: string;
  aspects: Aspect[];
  ratings: Rating[];
  closed: boolean;
};

type Participant = {
  id: string;
  name: string;
  company: string;
  totalScore: number;
  scoreTrack: { roundId: string; title: string; score: number }[];
};

type EventRecord = {
  id: string;
  title: string;
  participants: Participant[];
  rounds: Round[];
  currentRoundId: string | null;
  ratingOpen: boolean;
  speechTimer: Timer;
  ratingTimer: Timer;
};

type Stored = {
  id: string;
  host_key_hash: string;
  vote_key_hash: string;
  state: EventRecord | string;
};

export function validId(id: string) {
  return /^[A-Za-z0-9_-]{8,32}$/.test(id);
}

function newId() {
  return randomBytes(12).toString("base64url");
}

function newKey() {
  return randomBytes(24).toString("base64url");
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function keysMatch(given: string, hexHash: string) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(given) || !/^[a-f0-9]{64}$/.test(hexHash)) return false;
  const a = createHash("sha256").update(given).digest();
  const b = Buffer.from(hexHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function clip(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function asRecord(raw: unknown): EventRecord | null {
  const value = typeof raw === "string" ? safeParse(raw) : raw;
  if (!value || typeof value !== "object") return null;
  return value as EventRecord;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function blankEvent(id: string, title: string): EventRecord {
  return {
    id,
    title,
    participants: [],
    rounds: [],
    currentRoundId: null,
    ratingOpen: false,
    speechTimer: { totalSec: 300, remainingMs: 300_000, running: false, startedAt: null },
    ratingTimer: { totalSec: 120, remainingMs: 120_000, running: false, startedAt: null },
  };
}

function normalizeAspects(raw: unknown): Aspect[] {
  const list = Array.isArray(raw) ? raw : DEFAULT_ASPECT_TITLES;
  const out: Aspect[] = [];
  for (let i = 0; i < 3; i++) {
    const item = list[i];
    const title =
      clip(typeof item === "string" ? item : DEFAULT_ASPECT_TITLES[i], 40) || DEFAULT_ASPECT_TITLES[i];
    out.push({ id: i, title, color: ASPECT_COLORS[i] });
  }
  return out;
}

function liveRemaining(timer: Timer, now: number) {
  if (!timer.running || !timer.startedAt) return timer.remainingMs;
  return Math.max(0, timer.remainingMs - (now - timer.startedAt));
}

function settleTimers(ev: EventRecord, now: number) {
  let changed = false;
  if (timerFinished(ev.speechTimer, now)) {
    const overdue = Math.max(0, now - (ev.speechTimer.startedAt ?? now) - ev.speechTimer.remainingMs);
    clearTimer(ev.speechTimer);
    if (ev.currentRoundId) {
      const budget = ev.ratingTimer.totalSec * 1000;
      if (overdue >= budget) {
        clearTimer(ev.ratingTimer);
        ev.ratingOpen = false;
        finishCurrentRound(ev, now);
      } else {
        ev.ratingTimer.remainingMs = budget - overdue;
        ev.ratingTimer.running = false;
        ev.ratingTimer.startedAt = null;
        startTimer(ev.ratingTimer, now);
        ev.ratingOpen = true;
      }
    }
    changed = true;
  }
  if (timerFinished(ev.ratingTimer, now)) {
    clearTimer(ev.ratingTimer);
    ev.ratingOpen = false;
    finishCurrentRound(ev, now);
    changed = true;
  }
  return changed;
}

function timerFinished(timer: Timer, now: number) {
  return Boolean(timer.running && timer.startedAt && liveRemaining(timer, now) <= 0);
}

function clearTimer(timer: Timer) {
  timer.remainingMs = 0;
  timer.running = false;
  timer.startedAt = null;
}

function beginRoundClock(ev: EventRecord, now: number) {
  ev.ratingOpen = true;
  ev.speechTimer.remainingMs = ev.speechTimer.totalSec * 1000;
  ev.speechTimer.running = false;
  ev.speechTimer.startedAt = null;
  startTimer(ev.speechTimer, now);
  ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
  ev.ratingTimer.running = false;
  ev.ratingTimer.startedAt = null;
}

function nextUnplayed(ev: EventRecord) {
  const current = ev.rounds.find((round) => round.id === ev.currentRoundId);
  const start = current
    ? ev.participants.findIndex((person) => person.id === current.participantId) + 1
    : 0;
  for (let i = Math.max(0, start); i < ev.participants.length; i++) {
    const person = ev.participants[i];
    if (!ev.rounds.some((round) => round.participantId === person.id)) return person;
  }
  return null;
}

function finishCurrentRound(ev: EventRecord, now: number) {
  const current = ev.rounds.find((round) => round.id === ev.currentRoundId);
  if (!current || current.closed) return;
  current.closed = true;
  const next = nextUnplayed(ev);
  if (!next || ev.rounds.length >= MAX_ROUNDS) return;
  const round = makeRound(
    next.id,
    current.title,
    current.aspects?.map((aspect) => aspect.title),
  );
  ev.rounds.push(round);
  ev.currentRoundId = round.id;
  beginRoundClock(ev, now);
}

function stopTimer(timer: Timer, now: number) {
  timer.remainingMs = liveRemaining(timer, now);
  timer.running = false;
  timer.startedAt = null;
}

function startTimer(timer: Timer, now: number) {
  const left = liveRemaining(timer, now);
  timer.remainingMs = left;
  if (left <= 0) {
    timer.running = false;
    timer.startedAt = null;
    return;
  }
  timer.running = true;
  timer.startedAt = now;
}

function serializeTimer(timer: Timer, now: number) {
  const remainingMs = liveRemaining(timer, now);
  return {
    remainingMs,
    running: Boolean(timer.running && timer.startedAt && remainingMs > 0),
    totalSec: timer.totalSec,
  };
}

function scoresOf(row: Rating) {
  return Array.isArray(row.scores) ? row.scores : [0, 0, 0];
}

function roundAspectAverages(round: Round) {
  const ratings = Array.isArray(round.ratings) ? round.ratings : [];
  const n = ratings.length;
  const sums = [0, 0, 0];
  for (const row of ratings) {
    const scores = scoresOf(row);
    for (let i = 0; i < 3; i++) sums[i] += Number(scores[i]) || 0;
  }
  const aspects = round.aspects?.length ? round.aspects : normalizeAspects(undefined);
  return aspects.map((aspect, i) => ({
    id: aspect.id,
    title: aspect.title,
    color: aspect.color,
    average: n ? Math.round((sums[i] / n) * 1000) / 1000 : 0,
  }));
}

function roundAverage(round: Round) {
  const ratings = Array.isArray(round.ratings) ? round.ratings : [];
  if (ratings.length === 0) return 0;
  const parts = roundAspectAverages(round);
  const sum = parts.reduce((total, part) => total + part.average, 0);
  return Math.round((sum / parts.length) * 1000) / 1000;
}

function recomputeTotals(ev: EventRecord) {
  const byParticipant = new Map<string, { roundPoints: Participant["scoreTrack"]; total: number }>();
  for (const participant of ev.participants) {
    byParticipant.set(participant.id, { roundPoints: [], total: 0 });
  }
  for (const round of ev.rounds) {
    const row = byParticipant.get(round.participantId);
    const ratings = Array.isArray(round.ratings) ? round.ratings : [];
    if (row && ratings.length > 0) {
      const score = roundAverage(round);
      row.roundPoints.push({ roundId: round.id, title: round.title, score });
      row.total += score;
    }
  }
  for (const participant of ev.participants) {
    const row = byParticipant.get(participant.id);
    participant.totalScore = Math.round((row?.total ?? 0) * 1000) / 1000;
    participant.scoreTrack = row?.roundPoints ?? [];
  }
}

function buildRatingsBreakdown(round: Round) {
  return (round.ratings ?? []).map((row) => {
    const scores = scoresOf(row).map((score) => Number(score) || 0);
    const aspects = round.aspects?.length ? round.aspects : normalizeAspects(undefined);
    const perAspect = aspects.map((aspect, i) => ({
      title: aspect.title,
      color: aspect.color,
      score: scores[i] ?? 0,
    }));
    const total =
      scores.length > 0
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 1000) / 1000
        : 0;
    return { name: row.name, company: row.company, scores, perAspect, total };
  });
}

function publicEvent(ev: EventRecord, role: Role, now: number) {
  settleTimers(ev, now);
  recomputeTotals(ev);
  const current = ev.rounds.find((round) => round.id === ev.currentRoundId) ?? null;
  const currentParticipant = current
    ? ev.participants.find((participant) => participant.id === current.participantId)
    : null;
  const roundLive = current
    ? {
        id: current.id,
        title: current.title,
        participantId: current.participantId,
        participantName: currentParticipant?.name ?? "—",
        ratingsCount: current.ratings?.length ?? 0,
        average: roundAverage(current),
        aspects: roundAspectAverages(current),
        aspectTitles: (current.aspects ?? []).map((aspect) => aspect.title),
      }
    : null;
  const timers = {
    speech: serializeTimer(ev.speechTimer, now),
    rating: serializeTimer(ev.ratingTimer, now),
  };

  if (role === "guest") {
    return {
      id: ev.id,
      title: ev.title,
      currentRoundId: ev.currentRoundId,
      ratingOpen: ev.ratingOpen,
      timers,
      roundLive,
      participants: ev.participants.map((participant) => ({ id: participant.id, name: participant.name })),
    };
  }

  if (role === "prep") {
    return {
      id: ev.id,
      title: ev.title,
      roundLive: current
        ? { participantName: currentParticipant?.name ?? "—", title: current.title }
        : null,
      timers: { speech: timers.speech },
    };
  }

  const participantRows = ev.participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    company: participant.company,
    totalScore: participant.totalScore,
    scoreTrack: participant.scoreTrack,
  }));

  if (role === "screen") {
    const leaderboard = [...participantRows]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((participant, index) => ({ rank: index + 1, ...participant }));
    const ratingsBreakdown =
      current && !ev.ratingOpen && (current.ratings?.length ?? 0) > 0
        ? buildRatingsBreakdown(current)
        : null;
    return {
      id: ev.id,
      title: ev.title,
      currentRoundId: ev.currentRoundId,
      ratingOpen: ev.ratingOpen,
      timers,
      roundLive,
      participant: currentParticipant
        ? { name: currentParticipant.name, company: currentParticipant.company }
        : null,
      leaderboard,
      ratingsBreakdown,
    };
  }

  return {
    id: ev.id,
    title: ev.title,
    currentRoundId: ev.currentRoundId,
    ratingOpen: ev.ratingOpen,
    timers,
    roundLive,
    participants: participantRows,
    rounds: ev.rounds.map((round) => ({
      id: round.id,
      title: round.title,
      participantId: round.participantId,
      ratingsCount: round.ratings?.length ?? 0,
      average: roundAverage(round),
      aspects: roundAspectAverages(round),
      closed: round.closed,
    })),
  };
}

export async function createEvent(rawTitle: unknown) {
  const title = clip(rawTitle, 80) || "Мероприятие";
  const id = newId();
  const hostKey = newKey();
  const voteKey = newKey();
  const state = blankEvent(id, title);
  const inserted = await withTx(async (q) => {
    const rows = await q<{ n: number | string }>("select count(*)::int as n from events");
    if (Number(rows[0]?.n ?? 0) >= MAX_EVENTS) return false;
    await q(
      "insert into events (id, host_key_hash, vote_key_hash, state) values ($1, $2, $3, $4::jsonb)",
      [id, hashKey(hostKey), hashKey(voteKey), JSON.stringify(state)],
    );
    return true;
  });
  if (!inserted) {
    return { error: "Уже много событий. Откройте сохранённую ссылку ведущего." as const };
  }
  return {
    hostKey,
    voteKey,
    event: publicEvent(state, "host", Date.now()),
  };
}

async function mutate(
  id: string,
  key: string,
  which: "host" | "vote",
  change: (ev: EventRecord, now: number) => string | null,
) {
  return withTx(async (q) => {
    const rows = await q<Stored>(
      "select id, host_key_hash, vote_key_hash, state from events where id = $1 for update",
      [id],
    );
    const row = rows[0];
    if (!row) return { status: 404 as const, error: "Событие не найдено" };
    const hash = which === "host" ? row.host_key_hash : row.vote_key_hash;
    if (!keysMatch(key, hash)) {
      return {
        status: 401 as const,
        error: which === "host" ? "Ссылка ведущего не подходит" : "Ссылка жюри не подходит",
      };
    }
    const ev = asRecord(row.state);
    if (!ev) return { status: 500 as const, error: "Не удалось прочитать событие" };
    const now = Date.now();
    const settled = settleTimers(ev, now);
    const error = change(ev, now);
    if (error) {
      if (settled) {
        await q("update events set state = $2::jsonb, updated_at = now() where id = $1", [
          id,
          JSON.stringify(ev),
        ]);
      }
      return { status: 400 as const, error };
    }
    await q("update events set state = $2::jsonb, updated_at = now() where id = $1", [
      id,
      JSON.stringify(ev),
    ]);
    return { status: 200 as const, event: publicEvent(ev, which === "host" ? "host" : "guest", now) };
  });
}

export async function readEvent(id: string, role: Role, hostKey: string) {
  return withTx(async (q) => {
    const rows = await q<Stored>(
      "select id, host_key_hash, vote_key_hash, state from events where id = $1 for update",
      [id],
    );
    const row = rows[0];
    if (!row) return { status: 404 as const, error: "Событие не найдено" };
    if (role === "host" && !keysMatch(hostKey, row.host_key_hash)) {
      return { status: 401 as const, error: "Ссылка ведущего не подходит" };
    }
    const ev = asRecord(row.state);
    if (!ev) return { status: 500 as const, error: "Не удалось прочитать событие" };
    const now = Date.now();
    const changed = settleTimers(ev, now);
    const event = publicEvent(ev, role, now);
    if (changed) {
      await q("update events set state = $2::jsonb, updated_at = now() where id = $1", [
        id,
        JSON.stringify(ev),
      ]);
    }
    return { status: 200 as const, event };
  });
}

function makeRound(participantId: string, title: string, aspects: unknown): Round {
  return {
    id: newId(),
    title: clip(title, 80) || "Выступление",
    participantId,
    aspects: normalizeAspects(aspects),
    ratings: [],
    closed: false,
  };
}

export async function hostAction(id: string, hostKey: string, body: Record<string, unknown>) {
  const action = clip(body.action, 40);
  return mutate(id, hostKey, "host", (ev, now) => {
    if (action === "add-participant") {
      const name = clip(body.name, 80);
      if (!name) return "Укажите имя участника";
      if (ev.participants.length >= MAX_PARTICIPANTS) return "Слишком много участников";
      ev.participants.push({
        id: newId(),
        name,
        company: clip(body.company, 80) || "—",
        totalScore: 0,
        scoreTrack: [],
      });
      return null;
    }
    if (action === "remove-participant") {
      const participantId = clip(body.participantId, 40);
      ev.participants = ev.participants.filter((participant) => participant.id !== participantId);
      return null;
    }
    if (action === "set-round") {
      const participantId = clip(body.participantId, 40);
      const participant = ev.participants.find((item) => item.id === participantId);
      if (!participant) return "Выберите участника";
      const title = clip(body.title, 80);
      const current = ev.rounds.find((round) => round.id === ev.currentRoundId);
      if (current && current.participantId === participantId && !current.closed) {
        current.title = title || current.title;
        current.aspects = normalizeAspects(body.aspects);
        beginRoundClock(ev, now);
        return null;
      }
      if (ev.rounds.length >= MAX_ROUNDS) return "Слишком много раундов";
      if (current && !current.closed) current.closed = true;
      const round = makeRound(participantId, title, body.aspects);
      ev.rounds.push(round);
      ev.currentRoundId = round.id;
      beginRoundClock(ev, now);
      return null;
    }
    if (action === "switch-round") {
      const roundId = clip(body.roundId, 40);
      if (!ev.rounds.some((round) => round.id === roundId)) return "Раунд не найден";
      ev.currentRoundId = roundId;
      ev.ratingOpen = false;
      stopTimer(ev.speechTimer, now);
      stopTimer(ev.ratingTimer, now);
      return null;
    }
    if (action === "timer-config") {
      const speech = Number(body.speechSec);
      const rating = Number(body.ratingSec);
      if (Number.isFinite(speech) && speech > 0) {
        ev.speechTimer.totalSec = Math.max(30, Math.min(3 * 60 * 60, Math.round(speech)));
        if (!ev.speechTimer.running) ev.speechTimer.remainingMs = ev.speechTimer.totalSec * 1000;
      }
      if (Number.isFinite(rating) && rating > 0) {
        ev.ratingTimer.totalSec = Math.max(15, Math.min(2 * 60 * 60, Math.round(rating)));
        if (!ev.ratingTimer.running) ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
      }
      return null;
    }
    if (action === "reset-event") {
      const fresh = blankEvent(ev.id, ev.title);
      ev.participants = fresh.participants;
      ev.rounds = fresh.rounds;
      ev.currentRoundId = fresh.currentRoundId;
      ev.ratingOpen = false;
      ev.speechTimer = fresh.speechTimer;
      ev.ratingTimer = fresh.ratingTimer;
      return null;
    }
    if (action === "speech-timer") {
      return applyTimer(ev, "speechTimer", readStep(body), now);
    }
    if (action === "rating-timer") {
      return applyTimer(ev, "ratingTimer", readStep(body), now);
    }
    return "Неизвестное действие";
  });
}

function readStep(body: Record<string, unknown>) {
  return clip(body.step, 20);
}

function applyTimer(ev: EventRecord, key: "speechTimer" | "ratingTimer", step: string, now: number) {
  const timer = ev[key];
  if (step === "start") {
    if (key === "speechTimer") {
      stopTimer(ev.ratingTimer, now);
      ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
      startTimer(ev.speechTimer, now);
      if (ev.currentRoundId && ev.speechTimer.running) ev.ratingOpen = true;
      return null;
    }
    stopTimer(ev.speechTimer, now);
    ev.speechTimer.remainingMs = 0;
    if (liveRemaining(ev.ratingTimer, now) <= 0) ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
    startTimer(ev.ratingTimer, now);
    if (ev.currentRoundId && ev.ratingTimer.running) ev.ratingOpen = true;
    return null;
  }
  if (step === "pause") {
    stopTimer(timer, now);
    return null;
  }
  if (step === "reset") {
    stopTimer(timer, now);
    timer.remainingMs = timer.totalSec * 1000;
    return null;
  }
  return "Неизвестное действие";
}

export async function guestRate(id: string, body: Record<string, unknown>) {
  const voteKey = clip(body.voteKey, 128);
  return mutate(id, voteKey, "vote", (ev) => {
    if (!ev.ratingOpen) return "Оценка пока закрыта";
    const requestedRound = clip(body.roundId, 40);
    if (requestedRound && requestedRound !== ev.currentRoundId) return "Этот раунд уже закончился";
    const round = ev.rounds.find((item) => item.id === ev.currentRoundId);
    if (!round) return "Раунд не выбран";
    const name = clip(body.name, 80);
    const company = clip(body.company, 80);
    if (!name || !company) return "Укажите имя и компанию";
    if ((round.ratings?.length ?? 0) >= MAX_RATINGS) return "Слишком много оценок в этом раунде";
    const voterKey = `${name.toLowerCase()}|${company.toLowerCase()}`;
    if (round.ratings.some((row) => row.key === voterKey)) return "Вы уже оценили этот раунд";
    const scores = parseScores(body.scores);
    if (!scores) return "Оцените все три аспекта от 1 до 10";
    round.ratings.push({ key: voterKey, name, company, scores });
    return null;
  });
}

function parseScores(raw: unknown) {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const scores = raw.map((score) => Number(score));
  if (scores.some((score) => !Number.isInteger(score) || score < 1 || score > 10)) return null;
  return scores;
}
