# Dynamic API and Architecture Specification

## Request flow

```mermaid
flowchart LR
    A["Leaderboard UI"] --> B["Same-origin /api/leaderboard"]
    B --> C["api.wosatlas.com"]
    C --> B
    B --> A
```

Only the server-side hop may call WoS Atlas. The browser calls this project's own origin.

## Verified upstream requests

### Global

```http
GET https://api.wosatlas.com/v1/power/leaderboard?limit=100
Accept: application/json
```

### State

```http
GET https://api.wosatlas.com/v1/power/leaderboard?kid=77&limit=100
Accept: application/json
```

Request characteristics observed in Chrome:

- HTTP method: `GET`
- Request body: none
- Cookie: none
- `Authorization`: none
- Global response time in one observation: about 472 ms
- State 77 response time in one observation: about 227 ms

Do not copy browser fingerprint headers. Server code needs only an ordinary JSON request. Do not spoof `Origin: https://wosatlas.com`.

## Verified raw contract

```ts
export interface WosAtlasLeaderboardResponse {
  kid: number | null;
  entries: WosAtlasLeaderboardEntry[];
}

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
```

Global returns root `kid: null`. A State request returns the requested State ID at the root.

The captured Global response contained one player whose `kid` and `nick_name` were both null. The source UI rendered the name as `Player {uid}`.

`power` can exceed the 32-bit integer range. JavaScript `number` was safe for the observed values, but persistent storage should use a 64-bit integer or an exact numeric type.

## Internal response contract

The same-origin proxy should return only normalized fields required by the page:

```ts
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
```

Do not return upstream rate-limit internals, server addresses, cookies, or unrelated headers to the browser.

## Same-origin API design

Recommended project endpoints:

```http
GET /api/leaderboard
GET /api/leaderboard?stateId=77
```

Validation rules:

- Omitted `stateId` means Global.
- If present, `stateId` must be a positive safe integer.
- Reject repeated, decimal, negative, zero, empty, whitespace-only, or non-numeric State values with `400`.
- The upstream `limit` is fixed at `100`. Do not accept an arbitrary client-provided limit.

Suggested normalized errors:

| Situation | Local status | Client behavior |
| --- | ---: | --- |
| Invalid `stateId` | 400 | Inline validation, no upstream request |
| Upstream 429 | 503 | Retry message; honor `Retry-After` server-side |
| Upstream timeout | 504 | Error with Retry |
| Upstream non-2xx | 502 | Error with Retry |
| Invalid upstream JSON or schema | 502 | Error with Retry and server log |

Do not silently return old fixture data when the live request fails. That would make stale data look current.

## Rate limiting and freshness

Observed response headers:

```http
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
Access-Control-Allow-Origin: https://wosatlas.com
```

The observed reset was roughly one minute after the response. Treat 120 as observed evidence, not a permanent guarantee.

Recommended behavior:

1. Fetch on initial load.
2. Fetch when a State is committed with Enter.
3. Fetch when the State chip is removed.
4. Retry only on explicit user action or a small bounded policy. Never create an infinite retry loop.
5. Coalesce identical in-flight server requests.
6. If traffic requires caching, use a short, explicit cache and label its freshness. Do not hide a long cache behind a “live” claim.
7. Respect upstream `429` and `Retry-After`.

For the closest observed behavior, use no persistent response cache. A 5 to 15 second in-flight or micro-cache may be acceptable for duplicate requests caused by rendering, but this is a product tradeoff, not source behavior.

## Client query behavior

Suggested query keys:

```ts
["leaderboard", "global"]
["leaderboard", "state", stateId]
```

Required request behavior:

- Pass `AbortSignal` from the query library to `fetch`.
- Do not keep previous State rows visible during a new State search if matching the observed `Loading...` replacement behavior.
- Ignore or cancel stale requests.
- Retry button refetches the current scope.
- Removing the chip changes scope to Global and starts a new request.
- Do not write filter state to query parameters or browser history.

## Security boundary

- Keep the upstream base URL in server-only configuration.
- Never accept a full upstream URL from the browser.
- Never create an open proxy.
- Never forward browser Cookies or Authorization to WoS Atlas.
- Use a fixed upstream host and path.
- Apply a server timeout.
- Escape all player names through normal framework rendering. Do not inject HTML.
- Log status, duration, and request scope, but avoid dumping complete player payloads into production logs.

## Source limitation

This API is the immediate data source used by the WoS Atlas frontend. The exact Century Games endpoint, collector, scan schedule, and database logic remain server-side and were not exposed by either HAR.

Therefore:

- A replica using this API updates when WoS Atlas updates.
- It cannot guarantee live game state.
- It stops working if WoS Atlas changes or blocks the API.
- A fully independent implementation requires an authorized upstream source or permitted collector.

## Unrelated captured requests

`GET https://api.wosatlas.com/v1/auth/me` returned `401` for an unauthenticated browser. It supports the Sign in state, not leaderboard data.

`POST https://wosatlas.com/cdn-cgi/rum?` returned `204`. It is Cloudflare browser telemetry and must not be copied into the replica.
