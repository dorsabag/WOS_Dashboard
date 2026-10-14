import {
  fetchLiveLeaderboard,
  UpstreamHttpError,
  UpstreamSchemaError,
} from "./wosatlas-client.server";

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function parseStateId(url: URL): number | undefined {
  const values = url.searchParams.getAll("stateId");
  if (values.length === 0) return undefined;

  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) {
    throw new TypeError("Invalid stateId");
  }

  const stateId = Number(values[0]);
  if (!Number.isSafeInteger(stateId)) {
    throw new TypeError("Invalid stateId");
  }

  return stateId;
}

/**
 * Adapt this handler to the project's framework route convention.
 * It uses standard Web Request and Response primitives intentionally.
 */
export async function handleLeaderboardRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET") {
    return json(
      { error: "METHOD_NOT_ALLOWED" },
      { status: 405, headers: { allow: "GET" } },
    );
  }

  let stateId: number | undefined;
  try {
    stateId = parseStateId(new URL(request.url));
  } catch {
    return json(
      {
        error: "INVALID_STATE_ID",
        message: "stateId must be a positive integer",
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchLiveLeaderboard({
      stateId,
      signal: request.signal,
    });

    return json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      if (error.status === 429) {
        return json(
          {
            error: "UPSTREAM_RATE_LIMITED",
            message: "Leaderboard is temporarily rate limited",
          },
          { status: 503 },
        );
      }

      return json(
        {
          error: "UPSTREAM_FAILURE",
          message: "Leaderboard source returned an error",
        },
        { status: 502 },
      );
    }

    if (error instanceof UpstreamSchemaError) {
      return json(
        {
          error: "UPSTREAM_SCHEMA_CHANGED",
          message: "Leaderboard source returned an unexpected response",
        },
        { status: 502 },
      );
    }

    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return json(
        {
          error: "UPSTREAM_TIMEOUT",
          message: "Leaderboard source timed out",
        },
        { status: 504 },
      );
    }

    console.error("Unexpected leaderboard proxy error", error);
    return json(
      {
        error: "INTERNAL_ERROR",
        message: "Unable to load leaderboard",
      },
      { status: 500 },
    );
  }
}
