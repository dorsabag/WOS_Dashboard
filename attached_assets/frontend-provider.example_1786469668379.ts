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

export class LeaderboardRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getLeaderboard(options: {
  stateId?: number;
  signal?: AbortSignal;
}): Promise<LeaderboardResponse> {
  const { stateId, signal } = options;
  const url = new URL("/api/leaderboard", window.location.origin);

  if (stateId !== undefined) {
    url.searchParams.set("stateId", String(stateId));
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let message = "Unable to load the live leaderboard";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the generic message when the local proxy response is not JSON.
    }
    throw new LeaderboardRequestError(response.status, message);
  }

  return (await response.json()) as LeaderboardResponse;
}

// Example TanStack Query configuration:
//
// useQuery({
//   queryKey:
//     stateId === undefined
//       ? ["leaderboard", "global"]
//       : ["leaderboard", "state", stateId],
//   queryFn: ({ signal }) => getLeaderboard({ stateId, signal }),
//   placeholderData: undefined,
//   retry: 1,
//   staleTime: 0,
// });
