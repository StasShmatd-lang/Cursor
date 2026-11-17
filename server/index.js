import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import os from "os";
import { nanoid } from "nanoid";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_PORT = Number(process.env.CLIENT_PORT) || 5173;
const PUBLIC_ORIGIN = String(process.env.PUBLIC_ORIGIN || "").replace(/\/$/, "");

function clientLanOrigins() {
  const out = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        out.push(`http://${addr.address}:${CLIENT_PORT}`);
      }
    }
  }
  return out;
}

const DEFAULT_ASPECT_TITLES = ["Подача", "Содержание", "Убедительность"];
const ASPECT_COLORS = ["#BF5AF2", "#FF375F", "#64D2FF"];

/** @type {Map<string, object>} */
const events = new Map();

function normalizeAspects(raw) {
  const list = Array.isArray(raw) ? raw : DEFAULT_ASPECT_TITLES;
  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push({
      id: i,
      title: String(list[i] ?? DEFAULT_ASPECT_TITLES[i]).trim() || DEFAULT_ASPECT_TITLES[i],
      color: ASPECT_COLORS[i],
    });
  }
  return out;
}

function makeRound(participantId, title, aspects) {
  return {
    id: nanoid(6),
    title: String(title ?? "Выступление").trim() || "Выступление",
    participantId,
    aspects: normalizeAspects(aspects),
    ratings: new Map(),
    closed: false,
  };
}

function scoresFromRating(row) {
  if (Array.isArray(row)) return row;
  if (row && typeof row === "object" && Array.isArray(row.scores)) return row.scores;
  const n = Number(row);
  return [n, n, n];
}

function buildRatingsBreakdown(round) {
  const rows = [];
  for (const [key, row] of round.ratings) {
    const scores = scoresFromRating(row);
    const parts = key.split("|");
    const name = row?.name ?? parts[0] ?? "—";
    const company = row?.company ?? parts[1] ?? "—";
    const perAspect = round.aspects.map((a, i) => ({
      title: a.title,
      color: a.color,
      score: Number(scores[i]) || 0,
    }));
    const total =
      scores.length > 0
        ? Math.round((scores.reduce((s, x) => s + Number(x), 0) / scores.length) * 1000) / 1000
        : 0;
    rows.push({ name, company, scores, perAspect, total });
  }
  return rows;
}

function roundAspectAverages(round) {
  const n = round.ratings.size;
  const sums = [0, 0, 0];
  for (const row of round.ratings.values()) {
    const scores = scoresFromRating(row);
    for (let i = 0; i < 3; i++) sums[i] += Number(scores[i]) || 0;
  }
  return round.aspects.map((a, i) => ({
    id: a.id,
    title: a.title,
    color: a.color,
    average: n ? Math.round((sums[i] / n) * 1000) / 1000 : 0,
  }));
}

function roundAverage(round) {
  const parts = roundAspectAverages(round);
  if (round.ratings.size === 0) return 0;
  const sum = parts.reduce((s, p) => s + p.average, 0);
  return Math.round((sum / parts.length) * 1000) / 1000;
}

function buildRoundLive(current, currentParticipant) {
  return {
    id: current.id,
    title: current.title,
    participantId: current.participantId,
    participantName: currentParticipant?.name ?? "—",
    ratingsCount: current.ratings.size,
    average: roundAverage(current),
    aspects: roundAspectAverages(current),
    aspectTitles: current.aspects.map((a) => a.title),
  };
}

function recomputeTotals(ev) {
  const byParticipant = new Map();
  for (const p of ev.participants) {
    byParticipant.set(p.id, { roundPoints: [], total: 0 });
  }
  for (const round of ev.rounds) {
    const avg = roundAverage(round);
    const row = byParticipant.get(round.participantId);
    if (row && round.ratings.size > 0) {
      row.roundPoints.push({ roundId: round.id, title: round.title, score: avg });
      row.total += avg;
    }
  }
  for (const p of ev.participants) {
    const row = byParticipant.get(p.id);
    p.totalScore = Math.round((row?.total ?? 0) * 1000) / 1000;
    p.scoreTrack = row?.roundPoints ?? [];
  }
}

function timerRemaining(timer) {
  if (!timer.running || !timer.startedAt) return timer.remainingMs;
  const elapsed = Date.now() - timer.startedAt;
  return Math.max(0, timer.remainingMs - elapsed);
}

function serializeTimer(timer) {
  return {
    remainingMs: timerRemaining(timer),
    running: timer.running,
    totalSec: timer.totalSec,
  };
}

function ensureRoundAspects(round) {
  if (!round.aspects) round.aspects = normalizeAspects();
  for (const [, v] of round.ratings) {
    if (!Array.isArray(v)) break;
  }
}

function publicEvent(ev, role) {
  recomputeTotals(ev);
  const current = ev.rounds.find((r) => r.id === ev.currentRoundId) ?? null;
  if (current) ensureRoundAspects(current);
  const currentParticipant = current
    ? ev.participants.find((p) => p.id === current.participantId)
    : null;

  const base = {
    id: ev.id,
    title: ev.title,
    currentRoundId: ev.currentRoundId,
    ratingOpen: ev.ratingOpen,
    timers: {
      speech: serializeTimer(ev.speechTimer),
      rating: serializeTimer(ev.ratingTimer),
    },
    roundLive: current ? buildRoundLive(current, currentParticipant) : null,
  };

  if (role === "guest") {
    return {
      ...base,
      participants: ev.participants.map((p) => ({ id: p.id, name: p.name })),
    };
  }

  const participantRows = ev.participants.map((p) => ({
    id: p.id,
    name: p.name,
    company: p.company,
    totalScore: p.totalScore,
    scoreTrack: p.scoreTrack,
  }));

  if (role === "prep") {
    return {
      id: ev.id,
      title: ev.title,
      roundLive: current
        ? {
            participantName: currentParticipant?.name ?? "—",
            title: current.title,
          }
        : null,
      timers: { speech: base.timers.speech },
    };
  }

  if (role === "screen") {
    const leaderboard = [...participantRows]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, i) => ({ rank: i + 1, ...p }));
  const ratingsBreakdown =
    current && !ev.ratingOpen && current.ratings.size > 0 ? buildRatingsBreakdown(current) : null;
    return {
      ...base,
      participant: currentParticipant
        ? { name: currentParticipant.name, company: currentParticipant.company }
        : null,
      leaderboard,
      ratingsBreakdown,
    };
  }

  return {
    ...base,
    participants: participantRows,
    rounds: ev.rounds.map((r) => {
      ensureRoundAspects(r);
      return {
        id: r.id,
        title: r.title,
        participantId: r.participantId,
        ratingsCount: r.ratings.size,
        average: roundAverage(r),
        aspects: roundAspectAverages(r),
        closed: r.closed,
      };
    }),
  };
}

function broadcastEvent(ev, io) {
  io.to(`event:${ev.id}:host`).emit("event-state", publicEvent(ev, "host"));
  io.to(`event:${ev.id}:screen`).emit("event-state", publicEvent(ev, "screen"));
  io.to(`event:${ev.id}:guest`).emit("event-state", publicEvent(ev, "guest"));
  io.to(`event:${ev.id}:prep`).emit("event-state", publicEvent(ev, "prep"));
}

function ensureEvent(id, res) {
  const ev = events.get(id);
  if (!ev) {
    res?.status(404);
    return null;
  }
  return ev;
}

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/events", (req, res) => {
  const title = String(req.body?.title ?? "Мероприятие").trim() || "Мероприятие";
  const id = nanoid(8);
  const ev = {
    id,
    title,
    participants: [],
    rounds: [],
    currentRoundId: null,
    ratingOpen: false,
    speechTimer: { totalSec: 300, remainingMs: 300_000, running: false, startedAt: null },
    ratingTimer: { totalSec: 120, remainingMs: 120_000, running: false, startedAt: null },
  };
  events.set(id, ev);
  res.json(publicEvent(ev, "host"));
});

app.get("/api/events/:id", (req, res) => {
  const ev = ensureEvent(req.params.id, res);
  if (!ev) return res.json({ error: "Событие не найдено" });
  res.json(publicEvent(ev, "guest"));
});

app.get("/api/link-base", (req, res) => {
  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"] || "https";
  const forwarded =
    typeof forwardedHost === "string" && forwardedHost
      ? `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`
      : null;
  const lanOrigins = clientLanOrigins();
  const publicOrigin = PUBLIC_ORIGIN || forwarded;
  const suggestedOrigin = publicOrigin || lanOrigins[0] || null;
  res.json({ publicOrigin: publicOrigin || null, suggestedOrigin, lanOrigins });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

function stopTimer(timer) {
  timer.remainingMs = timerRemaining(timer);
  timer.running = false;
  timer.startedAt = null;
}

function startTimer(timer) {
  timer.running = true;
  timer.startedAt = Date.now();
}

function parseScores(payload) {
  if (Array.isArray(payload.scores) && payload.scores.length === 3) {
    return payload.scores.map((s) => Number(s));
  }
  if (payload.score != null) {
    const s = Number(payload.score);
    return [s, s, s];
  }
  return null;
}

io.on("connection", (socket) => {
  socket.on("join-event", ({ eventId, role }) => {
    const ev = events.get(eventId);
    if (!ev) {
      socket.emit("event-error", { message: "Событие не найдено" });
      return;
    }
    const r = role === "screen" || role === "host" || role === "prep" ? role : "guest";
    socket.join(`event:${eventId}:${r}`);
    socket.data.eventId = eventId;
    socket.data.role = r;
    socket.emit("event-state", publicEvent(ev, r));
  });

  socket.on("host:add-participant", ({ eventId, name, company }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    const n = String(name ?? "").trim();
    const c = String(company ?? "").trim();
    if (!n) {
      socket.emit("host-error", { message: "Укажите имя участника" });
      return;
    }
    ev.participants.push({
      id: nanoid(6),
      name: n,
      company: c || "—",
      totalScore: 0,
      scoreTrack: [],
    });
    broadcastEvent(ev, io);
  });

  socket.on("host:remove-participant", ({ eventId, participantId }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    ev.participants = ev.participants.filter((p) => p.id !== participantId);
    broadcastEvent(ev, io);
  });

  socket.on("host:set-round", ({ eventId, participantId, title, aspects }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    const p = ev.participants.find((x) => x.id === participantId);
    if (!p) {
      socket.emit("host-error", { message: "Выберите участника" });
      return;
    }
    const t = String(title ?? "Выступление").trim() || "Выступление";
    const round = makeRound(participantId, t, aspects);
    ev.rounds.push(round);
    ev.currentRoundId = round.id;
    ev.ratingOpen = false;
    stopTimer(ev.ratingTimer);
    ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
    broadcastEvent(ev, io);
  });

  socket.on("host:switch-round", ({ eventId, roundId }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    if (!ev.rounds.some((r) => r.id === roundId)) return;
    ev.currentRoundId = roundId;
    ev.ratingOpen = false;
    stopTimer(ev.ratingTimer);
    broadcastEvent(ev, io);
  });

  socket.on("host:new-criterion", ({ eventId, participantId, title, aspects }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    const p = ev.participants.find((x) => x.id === participantId);
    if (!p) return;
    const round = makeRound(participantId, title, aspects);
    ev.rounds.push(round);
    ev.currentRoundId = round.id;
    ev.ratingOpen = false;
    broadcastEvent(ev, io);
  });

  socket.on("host:timer-config", ({ eventId, speechSec, ratingSec }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    if (speechSec) {
      ev.speechTimer.totalSec = Math.max(30, Number(speechSec));
      if (!ev.speechTimer.running) {
        ev.speechTimer.remainingMs = ev.speechTimer.totalSec * 1000;
      }
    }
    if (ratingSec) {
      ev.ratingTimer.totalSec = Math.max(15, Number(ratingSec));
      if (!ev.ratingTimer.running) {
        ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
      }
    }
    broadcastEvent(ev, io);
  });

  socket.on("host:speech-timer", ({ eventId, action }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    if (action === "start") startTimer(ev.speechTimer);
    else if (action === "pause") stopTimer(ev.speechTimer);
    else if (action === "reset") {
      stopTimer(ev.speechTimer);
      ev.speechTimer.remainingMs = ev.speechTimer.totalSec * 1000;
    }
    broadcastEvent(ev, io);
  });

  socket.on("host:rating-timer", ({ eventId, action }) => {
    const ev = events.get(eventId);
    if (!ev) return;
    if (action === "start") {
      startTimer(ev.ratingTimer);
      ev.ratingOpen = true;
      stopTimer(ev.speechTimer);
    } else if (action === "pause") {
      stopTimer(ev.ratingTimer);
      ev.ratingOpen = false;
    } else if (action === "reset") {
      stopTimer(ev.ratingTimer);
      ev.ratingTimer.remainingMs = ev.ratingTimer.totalSec * 1000;
      ev.ratingOpen = false;
    }
    broadcastEvent(ev, io);
  });

  socket.on("guest:rate", (payload) => {
    const { eventId, name, company } = payload;
    const ev = events.get(eventId);
    if (!ev) {
      socket.emit("rate-error", { message: "Событие не найдено" });
      return;
    }
    if (!ev.ratingOpen) {
      socket.emit("rate-error", { message: "Оценка пока закрыта" });
      return;
    }
    const round = ev.rounds.find((r) => r.id === ev.currentRoundId);
    if (!round) {
      socket.emit("rate-error", { message: "Раунд не выбран" });
      return;
    }
    ensureRoundAspects(round);
    const n = String(name ?? "").trim();
    const c = String(company ?? "").trim();
    if (!n || !c) {
      socket.emit("rate-error", { message: "Укажите имя и компанию" });
      return;
    }
    const voterKey = `${n.toLowerCase()}|${c.toLowerCase()}`;
    if (round.ratings.has(voterKey)) {
      socket.emit("rate-error", { message: "Вы уже оценили этот раунд" });
      return;
    }
    const scores = parseScores(payload);
    if (!scores || scores.some((s) => !Number.isFinite(s) || s < 1 || s > 10)) {
      socket.emit("rate-error", { message: "Оцените все три аспекта от 1 до 10" });
      return;
    }
    round.ratings.set(voterKey, { name: n, company: c, scores });
    broadcastEvent(ev, io);
    socket.emit("rate-success", publicEvent(ev, "guest"));
  });
});

setInterval(() => {
  for (const ev of events.values()) {
    let running = false;
    let changed = false;
    for (const key of ["speechTimer", "ratingTimer"]) {
      const t = ev[key];
      if (t.running && t.startedAt) {
        running = true;
        const left = timerRemaining(t);
        if (left <= 0) {
          t.remainingMs = 0;
          t.running = false;
          t.startedAt = null;
          if (key === "ratingTimer") ev.ratingOpen = false;
          changed = true;
        }
      }
    }
    if (running || changed) broadcastEvent(ev, io);
  }
}, 250);

const HOST = process.env.HOST || "0.0.0.0";
httpServer.listen(PORT, HOST, () => {
  const lan = clientLanOrigins().join(", ") || "—";
  console.log(`Server listening on http://${HOST}:${PORT} (client ~${lan})`);
  if (PUBLIC_ORIGIN) console.log(`PUBLIC_ORIGIN=${PUBLIC_ORIGIN}`);
});