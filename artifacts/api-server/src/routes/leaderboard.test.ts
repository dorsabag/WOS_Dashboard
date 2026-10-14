import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
vi.mock("../middlewares/ownerAuth", () => ({
  requireOwner: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import request from "supertest";
import app from "../app";
import { clearLeaderboardCache } from "./leaderboard";

const realFetch = globalThis.fetch;

function upstreamEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    rank: 1,
    uid: 111222333,
    kid: 245,
    power: 18_680_000_000,
    nick_name: "IceQueen",
    kingdom_name: "Frostfall",
    stove_lv: 80,
    last_jump_pct: 0.032,
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  clearLeaderboardCache();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("GET /api/leaderboard — mapping", () => {
  it("maps upstream entries to the normalized contract (global scope)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        kid: null,
        entries: [
          upstreamEntry(),
          upstreamEntry({
            rank: 2,
            uid: 42,
            kid: null,
            nick_name: null,
            last_jump_pct: null,
            power: 6_000_000_000,
            stove_lv: 55,
          }),
        ],
      }),
    );

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.scope).toEqual({ type: "global", stateId: null });
    expect(typeof res.body.fetchedAt).toBe("string");
    expect(res.body.rows).toHaveLength(2);

    expect(res.body.rows[0]).toEqual({
      rank: 1,
      playerId: "111222333",
      playerName: "IceQueen",
      stateId: 245,
      power: 18_680_000_000,
      furnaceLevel: 80,
      deltaPercent: 3.2,
    });

    // Null name falls back to "Player {uid}"; null jump pct stays null.
    expect(res.body.rows[1]).toEqual({
      rank: 2,
      playerId: "42",
      playerName: "Player 42",
      stateId: null,
      power: 6_000_000_000,
      furnaceLevel: 55,
      deltaPercent: null,
    });

    // Upstream URL: fixed host, limit=100, no kid for global scope.
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("https://api.wosatlas.com/v1/power/leaderboard");
    expect(calledUrl).toContain("limit=100");
    expect(calledUrl).not.toContain("kid=");
  });

  it("passes stateId upstream as kid and returns state scope", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ kid: 245, entries: [upstreamEntry()] }),
    );

    const res = await request(app).get("/api/leaderboard?stateId=245");

    expect(res.status).toBe(200);
    expect(res.body.scope).toEqual({ type: "state", stateId: 245 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("kid=245");
  });

  it("returns an empty rows array when upstream has no entries", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ kid: null, entries: [] }));

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
  });
});

describe("GET /api/leaderboard — stateId validation", () => {
  it.each([
    ["non-numeric", "abc"],
    ["decimal", "1.5"],
    ["negative", "-3"],
    ["zero", "0"],
    ["leading zero", "007"],
    ["empty", ""],
  ])("rejects %s stateId with 400", async (_label, value) => {
    const res = await request(app).get(
      `/api/leaderboard?stateId=${encodeURIComponent(value)}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_STATE_ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects repeated stateId params with 400", async () => {
    const res = await request(app).get("/api/leaderboard?stateId=1&stateId=2");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_STATE_ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/leaderboard — caching", () => {
  it("serves a cached snapshot within the TTL without re-hitting upstream", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ kid: null, entries: [upstreamEntry()] }),
    );

    const first = await request(app).get("/api/leaderboard");
    expect(first.status).toBe(200);

    const second = await request(app).get("/api/leaderboard");
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches per scope: global and state snapshots are independent", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ kid: null, entries: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ kid: 245, entries: [upstreamEntry()] }),
      );

    const globalRes = await request(app).get("/api/leaderboard");
    const stateRes = await request(app).get("/api/leaderboard?stateId=245");

    expect(globalRes.body.scope).toEqual({ type: "global", stateId: null });
    expect(stateRes.body.scope).toEqual({ type: "state", stateId: 245 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Both scopes now served from cache.
    await request(app).get("/api/leaderboard");
    await request(app).get("/api/leaderboard?stateId=245");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refetches upstream after the TTL expires", async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ kid: null, entries: [] }))
        .mockResolvedValueOnce(
          jsonResponse({ kid: null, entries: [upstreamEntry()] }),
        );

      const first = await request(app).get("/api/leaderboard");
      expect(first.body.rows).toEqual([]);

      vi.advanceTimersByTime(60_001);

      const second = await request(app).get("/api/leaderboard");
      expect(second.body.rows).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to the cached snapshot when upstream returns 429 after expiry", async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ kid: null, entries: [upstreamEntry()] }),
        )
        .mockResolvedValueOnce(new Response("rate limited", { status: 429 }));

      const first = await request(app).get("/api/leaderboard");
      expect(first.status).toBe(200);
      // Normal (live) response must NOT carry isStale.
      expect(first.body.isStale).toBeUndefined();

      vi.advanceTimersByTime(60_001);

      const second = await request(app).get("/api/leaderboard");
      expect(second.status).toBe(200);
      // The stale fallback must carry isStale: true and preserve all other fields.
      expect(second.body.isStale).toBe(true);
      expect(second.body.scope).toEqual(first.body.scope);
      expect(second.body.rows).toEqual(first.body.rows);
      expect(second.body.fetchedAt).toBe(first.body.fetchedAt);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not set isStale on a fresh within-TTL cached response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ kid: null, entries: [upstreamEntry()] }),
    );

    const first = await request(app).get("/api/leaderboard");
    expect(first.status).toBe(200);
    expect(first.body.isStale).toBeUndefined();

    // Second request served from cache (within TTL) — still no isStale.
    const second = await request(app).get("/api/leaderboard");
    expect(second.status).toBe(200);
    expect(second.body.isStale).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not fall back to cache for non-429 upstream failures", async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ kid: null, entries: [] }))
        .mockResolvedValueOnce(new Response("boom", { status: 500 }));

      await request(app).get("/api/leaderboard");
      vi.advanceTimersByTime(60_001);

      const res = await request(app).get("/api/leaderboard");
      expect(res.status).toBe(502);
      expect(res.body.error).toBe("UPSTREAM_FAILURE");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("GET /api/leaderboard — upstream error mapping", () => {
  it("maps upstream 429 to 503 when no snapshot is cached", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("rate limited", { status: 429 }),
    );

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("UPSTREAM_RATE_LIMITED");
  });

  it("maps other upstream HTTP errors to 502", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_FAILURE");
  });

  it("maps schema drift (root contract) to 502", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: true }));

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_SCHEMA_CHANGED");
  });

  it("maps schema drift (entry contract) to 502", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        kid: null,
        entries: [upstreamEntry({ power: "not-a-number" })],
      }),
    );

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_SCHEMA_CHANGED");
  });

  it("maps a fractional entry kid to 502 (stateId must stay an integer)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        kid: null,
        entries: [upstreamEntry({ kid: 24.5 })],
      }),
    );

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_SCHEMA_CHANGED");
  });

  it("maps network-level fetch failures (DNS/TLS/reset) to 502", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_FAILURE");
  });

  it("maps invalid upstream JSON to 502", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>not json</html>", { status: 200 }),
    );

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("UPSTREAM_SCHEMA_CHANGED");
  });

  it("maps upstream timeout to 504", async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException("Upstream timeout", "TimeoutError"),
    );

    const res = await request(app).get("/api/leaderboard");

    expect(res.status).toBe(504);
    expect(res.body.error).toBe("UPSTREAM_TIMEOUT");
  });
});

describe("GET /api/leaderboard — stampede prevention", () => {
  it("coalesces concurrent requests for the same scope into a single upstream fetch", async () => {
    // Hold the upstream response until we release it so all requests land
    // before any of them resolves.
    let resolveUpstream!: (r: Response) => void;
    const upstreamHeld = new Promise<Response>((resolve) => {
      resolveUpstream = resolve;
    });

    fetchMock.mockReturnValueOnce(upstreamHeld);

    // Fire three concurrent requests before the upstream resolves.
    const [r1, r2, r3] = await Promise.all([
      request(app).get("/api/leaderboard"),
      request(app).get("/api/leaderboard"),
      request(app).get("/api/leaderboard"),
    ].map(async (req) => {
      // Resolve upstream just before the first awaited tick so all three
      // requests are in-flight when the promise settles.
      resolveUpstream(jsonResponse({ kid: null, entries: [upstreamEntry()] }));
      return req;
    }));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    // Despite three concurrent requests, upstream was hit exactly once.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not poison future requests after a shared fetch errors", async () => {
    // First call: upstream fails.
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      // Second call: upstream succeeds.
      .mockResolvedValueOnce(
        jsonResponse({ kid: null, entries: [upstreamEntry()] }),
      );

    const first = await request(app).get("/api/leaderboard");
    expect(first.status).toBe(502);
    expect(first.body.error).toBe("UPSTREAM_FAILURE");

    // A subsequent request must try upstream again (inFlight was cleared).
    const second = await request(app).get("/api/leaderboard");
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("independent scopes each get their own in-flight promise", async () => {
    let resolveGlobal!: (r: Response) => void;
    let resolveState!: (r: Response) => void;
    const globalHeld = new Promise<Response>((r) => { resolveGlobal = r; });
    const stateHeld  = new Promise<Response>((r) => { resolveState  = r; });

    fetchMock
      .mockReturnValueOnce(globalHeld)
      .mockReturnValueOnce(stateHeld);

    resolveGlobal(jsonResponse({ kid: null,  entries: [] }));
    resolveState( jsonResponse({ kid: 245,   entries: [upstreamEntry()] }));

    const [globalRes, stateRes] = await Promise.all([
      request(app).get("/api/leaderboard"),
      request(app).get("/api/leaderboard?stateId=245"),
    ]);

    expect(globalRes.body.scope).toEqual({ type: "global", stateId: null });
    expect(stateRes.body.scope).toEqual({ type: "state", stateId: 245 });
    // Two different scopes → two separate upstream fetches.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchLiveLeaderboard — stalled body", () => {
  it("still times out when upstream sends headers but stalls the body", async () => {
    vi.useFakeTimers();
    try {
      const { fetchLiveLeaderboard } = await import("../lib/wosatlas-client");

      // Headers arrive fine, but the body never completes.
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () => new Promise(() => {}),
      } as unknown as Response);

      const promise = fetchLiveLeaderboard({});
      const assertion = expect(promise).rejects.toMatchObject({
        name: "TimeoutError",
      });

      await vi.advanceTimersByTimeAsync(8_001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
