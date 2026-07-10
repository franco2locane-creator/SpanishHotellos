// Deterministic per-day pick from a pool, seeded by calendar date + user + a
// salt naming which slot it's for. Same day + same user + same salt always
// picks the same item; a different date almost always picks a different one.
// No dependencies (unlike lib/today.ts) so it can be unit tested directly.
export function dailySeedIndex(poolLength: number, userId: string, salt: string, dateISO: string): number {
  if (poolLength <= 0) throw new Error('dailySeedIndex: poolLength must be > 0');
  const seedStr = `${dateISO}:${userId}:${salt}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % poolLength;
}

export function dailySeededPick<T>(pool: T[], userId: string, salt: string, dateISO: string): T {
  return pool[dailySeedIndex(pool.length, userId, salt, dateISO)];
}
