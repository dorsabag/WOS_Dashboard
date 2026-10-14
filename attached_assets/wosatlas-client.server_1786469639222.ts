const WOS_ATLAS_API_BASE = "https://api.wosatlas.com";
const REQUEST_TIMEOUT_MS = 8_000;

export interface WosAtlasLeaderboardEntry {
  rank: number;
  uid: number;
  kid: number | null;
  power: number;
  nick_name: string | null;
  kingdom_name: string | null;
  stove_lv: number;
  last_jump_pct: number | null;
}

export interface WosAtlasLeaderboardResponse {
  kid: number | null;
  entries: WosAtlasLeaderboardEntry[];
}

export interface LeaderboardPlayer {
  rank: number;
  playerId: string;
  playerName: string;
  stateId: number | null;
  power: number;
  furnaceLevel: number;
  deltaPercent: number | null;
}

export interface LeaderboardResponse {
  scope: { type: "global" } | { type: "state"; stateId: number };
  rows: LeaderboardPlayer[];
  fetchedAt: string;
}

export class UpstreamHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: string | null,
  ) {
    super(`WoS Atlas returned HTTP ${status}`);
  }
}

export class UpstreamSchemaError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isEntry(value: unknown): value is WosAtlasLeaderboardEntry {
  if (!isRecord(value)) return false;

  return (
    isSafeInteger(value.rank) &&
    isSafeInteger(value.uid) &&
    isNullableNumber(value.kid) &&
    isFiniteNumber(value.power) &&
    isNullableString(value.nick_name) &&
    isNullableString(value.kingdom_name) &&
    isSafeInteger(value.stove_lv) &&
    isNullableNumber(value.last_jump_pct)
  );
}

function parseResponse(
  value: unknown,
  expectedKid: number | null,
): WosAtlasLeaderboardResponse {
  if (!isRecord(value)) {
    throw new UpstreamSchemaError("WoS Atlas payload is not an object");
  }

  if (value.kid !== expectedKid || !Array.isArray(value.entries)) {
    throw new UpstreamSchemaError("WoS Atlas root contract changed");
  }

  if (!value.entries.every(isEntry)) {
    throw new UpstreamSchemaError("WoS Atlas entry contract changed");
  }

  return {
    kid: value.kid as number | null,
    entries: value.entries,
  };
}

function mapEntry(entry: WosAtlasLeaderboardEntry): LeaderboardPlayer {
  return {
    rank: entry.rank,
    playerId: String(entry.uid),
    playerName: entry.nick_name ?? `Player ${entry.uid}`,
    stateId: entry.kid,
    power: entry.power,
    furnaceLevel: entry.stove_lv,
    deltaPercent:
      entry.last_jump_pct === null ? null : entry.last_jump_pct * 100,
  };
}

export async function fetchLiveLeaderboard(options: {
  stateId?: number;
  signal?: AbortSignal;
}): Promise<LeaderboardResponse> {
  const { stateId, signal } = options;

  if (
    stateId !== undefined &&
    (!Number.isSafeInteger(stateId) || stateId <= 0)
  ) {
    throw new TypeError("stateId must be a positive safe integer");
  }

  const url = new URL("/v1/power/leaderboard", WOS_ATLAS_API_BASE);
  url.searchParams.set("limit", "100");
  if (stateId !== undefined) url.searchParams.set("kid", String(stateId));

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = setTimeout(
    () => controller.abort(new DOMException("Upstream timeout", "TimeoutError")),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    throw new UpstreamHttpError(
      response.status,
      response.headers.get("retry-after"),
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new UpstreamSchemaError("WoS Atlas returned invalid JSON");
  }

  const expectedKid = stateId ?? null;
  const payload = parseResponse(raw, expectedKid);

  return {
    scope:
      stateId === undefined
        ? { type: "global" }
        : { type: "state", stateId },
    rows: payload.entries.map(mapEntry),
    fetchedAt: new Date().toISOString(),
  };
}
