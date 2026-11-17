export type ScorePoint = { roundId: string; title: string; score: number };

export type AspectAverage = {
  id: number;
  title: string;
  color: string;
  average: number;
};

export type Participant = {
  id: string;
  name: string;
  company?: string;
  totalScore: number;
  scoreTrack: ScorePoint[];
};

export type RoundSummary = {
  id: string;
  title: string;
  participantId: string;
  ratingsCount: number;
  average: number;
  aspects?: AspectAverage[];
  closed?: boolean;
};

export type RoundLive = {
  id: string;
  title: string;
  participantId: string;
  participantName: string;
  ratingsCount: number;
  average: number;
  aspects: AspectAverage[];
  aspectTitles: string[];
};

export type TimerState = {
  remainingMs: number;
  running: boolean;
  totalSec: number;
};

export type EventStateHost = {
  id: string;
  title: string;
  participants: Participant[];
  rounds: RoundSummary[];
  currentRoundId: string | null;
  ratingOpen: boolean;
  timers: { speech: TimerState; rating: TimerState };
  roundLive: RoundLive | null;
};

export type EventStateGuest = {
  id: string;
  title: string;
  participants: { id: string; name: string }[];
  currentRoundId: string | null;
  ratingOpen: boolean;
  timers: { speech: TimerState; rating: TimerState };
  roundLive: RoundLive | null;
};

export type LeaderboardRow = {
  rank: number;
  id: string;
  name: string;
  company?: string;
  totalScore: number;
  scoreTrack: ScorePoint[];
};

export type JuryRatingRow = {
  name: string;
  company: string;
  scores: number[];
  perAspect: { title: string; color: string; score: number }[];
  total: number;
};

export type EventStateScreen = {
  id: string;
  title: string;
  currentRoundId: string | null;
  ratingOpen: boolean;
  timers: { speech: TimerState; rating: TimerState };
  roundLive: RoundLive | null;
  participant: { name: string; company: string } | null;
  leaderboard: LeaderboardRow[];
  ratingsBreakdown: JuryRatingRow[] | null;
};

export type EventStatePrep = {
  id: string;
  title: string;
  roundLive: { participantName: string; title: string } | null;
  timers: { speech: TimerState };
};