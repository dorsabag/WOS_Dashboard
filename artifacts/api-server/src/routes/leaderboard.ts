import { Router, type IRouter } from "express";
import {
  fetchLiveLeaderboard,
  UpstreamHttpError,
  UpstreamNetworkError,
  UpstreamSchemaError,
  type LeaderboardResponse,
} from "../lib/wosatlas-client";

const router: IRouter = Router();

/**
 * Short-lived per-scope cache. Repeat visits within the TTL are served from
 * memory instead of hitting the unofficial WoS Atlas API, and an upstream 429
 * falls back to the last known snapshot (even if expired) instead of erroring.
 */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  payload: LeaderboardResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * In-flight fetch promises, keyed by scope. When a cache entry is expired and
 * multiple requests arrive simultaneously, only the first triggers an upstream
 * fetch; subsequent callers await the same promise (cache stampede prevention).
 */
const inFlight = new Map<string, Promise<LeaderboardResponse>>();

function cacheKey(stateId: number | undefined): string {
  return stateId === undefined ? "global" : `state:${stateId}`;
}

/** Test hook: clear all cached snapshots and in-flight promises. */
export function clearLeaderboardCache(): void {
  cache.clear();
  inFlight.clear();
}

/**
 * Strictly parse the raw stateId query value.
 * Rejects repeated params (arrays), decimals, negatives, zero, and
 * non-numeric input. Returns { ok: false } on any invalid shape.
 */
function parseStateId(
  raw: unknown,
): { ok: true; stateId: number | undefined } | { ok: false } {
  if (raw === undefined) return { ok: true, stateId: undefined };
  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) return { ok: false };

  const stateId = Number(raw);
  if (!Number.isSafeInteger(stateId)) return { ok: false };

  return { ok: true, stateId };
}

/**
 * Fetch live data for the given scope, coalescing concurrent callers onto a
 * single in-flight promise. The promise is removed from `inFlight` as soon as
 * it settles (success or error) so the next request always starts fresh.
 */
function fetchCoalesced(stateId: number | undefined): Promise<LeaderboardResponse> {
  const key = cacheKey(stateId);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetchLiveLeaderboard({ stateId }).finally(() => {
    // Always remove the in-flight entry when settled so errors don't persist.
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

router.get("/", async (req, res) => {
  res.setHeader("cache-control", "no-store");

  const parsed = parseStateId(req.query.stateId);
  if (!parsed.ok) {
    res.status(400).json({
      error: "INVALID_STATE_ID",
      message: "stateId must be a positive integer",
    });
    return;
  }

  const key = cacheKey(parsed.stateId);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.payload);
    return;
  }

  try {
    const payload = await fetchCoalesced(parsed.stateId);
    cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json(payload);
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      if (error.status === 429) {
        // Rate limited upstream: serve the last known snapshot if we have
        // one (even expired) rather than surfacing an error.
        if (cached) {
          res.json({ ...cached.payload, isStale: true });
          return;
        }

        res.status(503).json({
          error: "UPSTREAM_RATE_LIMITED",
          message: "Leaderboard is temporarily rate limited",
        });
        return;
      }

      res.status(502).json({
        error: "UPSTREAM_FAILURE",
        message: "Leaderboard source returned an error",
      });
      return;
    }

    if (error instanceof UpstreamNetworkError) {
      res.status(502).json({
        error: "UPSTREAM_FAILURE",
        message: "Leaderboard source is unreachable",
      });
      return;
    }

    if (error instanceof UpstreamSchemaError) {
      res.status(502).json({
        error: "UPSTREAM_SCHEMA_CHANGED",
        message: "Leaderboard source returned an unexpected response",
      });
      return;
    }

    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      res.status(504).json({
        error: "UPSTREAM_TIMEOUT",
        message: "Leaderboard source timed out",
      });
      return;
    }

    console.error("Unexpected leaderboard proxy error", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to load leaderboard",
    });
  }
});

export default router;
