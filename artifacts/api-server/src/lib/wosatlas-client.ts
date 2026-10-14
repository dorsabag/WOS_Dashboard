/**
 * Server-side client for the (unofficial) WoS Atlas power leaderboard API.
 *
 * Upstream: GET https://api.wosatlas.com/v1/power/leaderboard?limit=100[&kid=N]
 *
 * Every entry is schema-validated before mapping so that upstream contract
 * changes surface as UpstreamSchemaError (mapped to 502 by the route) rather
 * than silently corrupt data.
 */

const WOS_ATLAS_API_BASE = "https://api.wosatlas.com";
const REQUEST_TIMEOUT_MS = 8_000;
const LEADERBOARD_LIMIT = 100;

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

interface WosAtlasLeaderboardResponse {
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
  scope: { type: "global"; stateId: null } | { type: "state"; stateId: number };
  rows: LeaderboardPlayer[];
  fetchedAt: string;
}

export class UpstreamHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: string | null,
  ) {
    super(`WoS Atlas returned HTTP ${status}`);
    this.name = "UpstreamHttpError";
  }
}

export class UpstreamSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamSchemaError";
  }
}

/** Network-level failure reaching WoS Atlas (DNS, TLS, socket reset, …). */
export class UpstreamNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpstreamNetworkError";
  }
}

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

function isNullableSafeInteger(value: unknown): value is number | null {
  return value === null || isSafeInteger(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isEntry(value: unknown): value is WosAtlasLeaderboardEntry {
  if (!isRecord(value)) return false;

  return (
    isSafeInteger(value.rank) &&
    isSafeInteger(value.uid) &&
    isNullableSafeInteger(value.kid) &&
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
  url.searchParams.set("limit", String(LEADERBOARD_LIMIT));
  if (stateId !== undefined) url.searchParams.set("kid", String(stateId));

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = setTimeout(
    () => controller.abort(new DOMException("Upstream timeout", "TimeoutError")),
    REQUEST_TIMEOUT_MS,
  );

  // Rejects when the controller aborts. Racing the body read against this
  // keeps the 8s timeout in force while the body streams — an upstream that
  // sends headers and then stalls the body still resolves as a timeout.
  const abortRejection = new Promise<never>((_, reject) => {
    if (controller.signal.aborted) reject(controller.signal.reason);
    else
      controller.signal.addEventListener(
        "abort",
        () => reject(controller.signal.reason),
        { once: true },
      );
  });
  // The race can settle via abortRejection while response.json() is still
  // pending; keep that dangling rejection from becoming an unhandled one.
  abortRejection.catch(() => {});

  let raw: unknown;
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      if (
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw error;
      }
      throw new UpstreamNetworkError("Failed to reach WoS Atlas", {
        cause: error,
      });
    }

    if (!response.ok) {
      throw new UpstreamHttpError(
        response.status,
        response.headers.get("retry-after"),
      );
    }

    try {
      raw = await Promise.race([response.json(), abortRejection]);
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      throw new UpstreamSchemaError("WoS Atlas returned invalid JSON");
    }
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  const expectedKid = stateId ?? null;
  const payload = parseResponse(raw, expectedKid);

  return {
    scope:
      stateId === undefined
        ? { type: "global", stateId: null }
        : { type: "state", stateId },
    rows: payload.entries.map(mapEntry),
    fetchedAt: new Date().toISOString(),
  };
}
