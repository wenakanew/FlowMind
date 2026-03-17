interface GitHubUser {
  login: string;
  id: number;
  name?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
}

const GITHUB_API_BASE = "https://api.github.com";

async function githubRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export async function githubGetCurrentUser(accessToken: string): Promise<GitHubUser> {
  return githubRequest<GitHubUser>(accessToken, "/user");
}

export async function githubListRepos(accessToken: string, limit = 30): Promise<GitHubRepo[]> {
  const clamped = Math.max(1, Math.min(100, Number(limit) || 30));
  return githubRequest<GitHubRepo[]>(
    accessToken,
    `/user/repos?per_page=${clamped}&sort=updated&direction=desc`,
  );
}

export async function githubCreateRepo(
  accessToken: string,
  name: string,
  description?: string,
  isPrivate = true,
): Promise<GitHubRepo> {
  return githubRequest<GitHubRepo>(accessToken, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });
}

export async function githubListIssues(
  accessToken: string,
  owner: string,
  repo: string,
  state = "open",
  limit = 20,
): Promise<GitHubIssue[]> {
  const clamped = Math.max(1, Math.min(100, Number(limit) || 20));
  return githubRequest<GitHubIssue[]>(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${encodeURIComponent(state)}&per_page=${clamped}`,
  );
}

export async function githubListPullRequests(
  accessToken: string,
  owner: string,
  repo: string,
  state = "open",
  limit = 20,
): Promise<GitHubPullRequest[]> {
  const clamped = Math.max(1, Math.min(100, Number(limit) || 20));
  return githubRequest<GitHubPullRequest[]>(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}&per_page=${clamped}`,
  );
}

export async function githubCreatePullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
): Promise<GitHubPullRequest> {
  return githubRequest<GitHubPullRequest>(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({ title, head, base, body }),
    },
  );
}
