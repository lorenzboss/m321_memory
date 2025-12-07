import { LeaderboardEntry, UserStats } from "../types/stats";

const BASE_URL = (
  process.env.REACT_APP_GAME_SERVICE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

type FetchOptions = Omit<RequestInit, "body"> & { signal?: AbortSignal };

function buildOptions(init?: FetchOptions): RequestInit {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const options: RequestInit = {
    ...init,
    headers,
  };

  options.credentials = options.credentials ?? "include";

  return options;
}

export async function fetchUserStats(
  username: string,
  options?: FetchOptions,
): Promise<UserStats | null> {
  const response = await fetch(
    `${BASE_URL}/stats/users/${encodeURIComponent(username)}`,
    buildOptions(options),
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch user stats (${response.status})`);
  }

  return (await response.json()) as UserStats;
}

export async function fetchLeaderboard(
  options?: FetchOptions,
): Promise<LeaderboardEntry[]> {
  const response = await fetch(
    `${BASE_URL}/stats/leaderboard`,
    buildOptions(options),
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard (${response.status})`);
  }

  return (await response.json()) as LeaderboardEntry[];
}

export { BASE_URL as statsServiceBaseUrl };
