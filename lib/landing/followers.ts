import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";

/**
 * TikTok follower counts shown on the landing pages. They are read from the public
 * profile pages at most once a day and kept in Firestore, so a blocked or failing
 * request never removes a number: the last good value (or the fallback) stays.
 * `start` is the follower count when Swibble took over the channel.
 */
export const FOLLOWER_ACCOUNTS = {
  aquis: { handle: "aquisplaza.aachen", fallback: 107_200, start: 0 },
  billstedt: { handle: "billstedtcenter", fallback: 55_800, start: 0 },
  olympia: { handle: "olympia.einkaufszentrum", fallback: 55_200, start: 0 },
  rushfood: { handle: "rushfood", fallback: 23_300, start: 0 },
  myzeil: { handle: "myzeil.frankfurt", fallback: 8_426, start: 5_293 },
} as const;

export type FollowerAccount = keyof typeof FOLLOWER_ACCOUNTS;
export type FollowerCounts = Record<FollowerAccount, number>;

export interface FollowerSnapshot {
  counts: FollowerCounts;
  /** Epoch milliseconds of the last successful read. */
  fetchedAt: number;
}

/** Day the fallback values above were read from TikTok. */
const FALLBACK_FETCHED_AT = Date.UTC(2026, 8, 19);
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const SETTINGS_COLLECTION = "settings";
const DOCUMENT = "landingFollowers";
const ACCOUNTS = Object.keys(FOLLOWER_ACCOUNTS) as FollowerAccount[];

export function fallbackSnapshot(): FollowerSnapshot {
  return {
    counts: Object.fromEntries(
      ACCOUNTS.map((account) => [account, FOLLOWER_ACCOUNTS[account].fallback]),
    ) as FollowerCounts,
    fetchedAt: FALLBACK_FETCHED_AT,
  };
}

/** Extracts the follower count of `handle` from the HTML of its public TikTok profile. */
export function parseFollowerCount(html: string, handle: string): number | null {
  // The profile JSON must belong to the requested account, not to a suggested one.
  if (!html.toLowerCase().includes(`"uniqueid":"${handle.toLowerCase()}"`)) return null;
  const match = html.match(/"followerCount":(\d{1,12})\b/);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isSafeInteger(count) && count > 0 ? count : null;
}

/** Rejects parse glitches: a channel does not lose half of its followers overnight. */
export function isPlausibleCount(next: number | null, previous: number): next is number {
  return next !== null && next >= previous * 0.5 && next <= previous * 10;
}

/** 107200 → "107.200" */
export function formatFollowers(count: number): string {
  return new Intl.NumberFormat("de-DE").format(count);
}

async function fetchFollowerCount(handle: string): Promise<number | null> {
  const response = await fetch(`https://www.tiktok.com/@${handle}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "de-DE,de;q=0.9",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) return null;
  return parseFollowerCount(await response.text(), handle);
}

function readCounts(data: unknown, base: FollowerCounts): FollowerCounts {
  const stored = (data ?? {}) as Partial<Record<FollowerAccount, unknown>>;
  const counts = { ...base };
  for (const account of ACCOUNTS) {
    const value = stored[account];
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
      counts[account] = value;
    }
  }
  return counts;
}

/**
 * Current follower counts. Refreshes from TikTok when the stored snapshot is older than
 * a day; every failure path returns the last known numbers instead of throwing.
 */
export async function getFollowerSnapshot(): Promise<FollowerSnapshot> {
  const fallback = fallbackSnapshot();
  if (!isFirebaseConfigured()) return fallback;

  try {
    const ref = getDb().collection(SETTINGS_COLLECTION).doc(DOCUMENT);
    const data = (await ref.get()).data() ?? {};
    const snapshot: FollowerSnapshot = {
      counts: readCounts(data.counts, fallback.counts),
      fetchedAt: typeof data.fetchedAt === "number" ? data.fetchedAt : fallback.fetchedAt,
    };
    const attemptedAt = typeof data.attemptedAt === "number" ? data.attemptedAt : 0;
    const now = Date.now();
    if (now - attemptedAt < REFRESH_AFTER_MS) return snapshot;

    // Claim the refresh first, so parallel page regenerations do not all hit TikTok.
    await ref.set({ attemptedAt: now }, { merge: true });

    const results = await Promise.all(
      ACCOUNTS.map((account) =>
        fetchFollowerCount(FOLLOWER_ACCOUNTS[account].handle).catch(() => null),
      ),
    );
    let updated = false;
    ACCOUNTS.forEach((account, index) => {
      const next = results[index];
      if (isPlausibleCount(next, snapshot.counts[account])) {
        snapshot.counts[account] = next;
        updated = true;
      }
    });
    if (!updated) return snapshot;

    snapshot.fetchedAt = now;
    await ref.set({ counts: snapshot.counts, fetchedAt: now }, { merge: true });
    return snapshot;
  } catch (error) {
    console.error("[landing] getFollowerSnapshot", error);
    return fallback;
  }
}

/** Facts for a page: biggest channel first, values formatted for display. */
export function resolveFacts(
  facts: { account: FollowerAccount; label: string }[] | undefined,
  snapshot: FollowerSnapshot,
): { value: string; label: string; start: string }[] {
  return [...(facts ?? [])]
    .sort((a, b) => snapshot.counts[b.account] - snapshot.counts[a.account])
    .map(({ account, label }) => ({
      value: formatFollowers(snapshot.counts[account]),
      label,
      start: formatFollowers(FOLLOWER_ACCOUNTS[account].start),
    }));
}
