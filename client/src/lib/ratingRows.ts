export type StoredRating = number[] | { name?: string; company?: string; scores: number[] };

export function scoresFromRating(row: StoredRating): number[] {
  if (Array.isArray(row)) return row;
  if (row?.scores && Array.isArray(row.scores)) return row.scores;
  const n = Number(row);
  return [n, n, n];
}