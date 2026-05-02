const axios = require("axios");

const GITHUB_API_BASE = "https://api.github.com";

function buildHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-intelligence-dashboard",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function mapRepository(repo, languages) {
  return {
    githubId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    visibility: repo.visibility,
    isPrivate: Boolean(repo.private),
    ownerLogin: repo.owner?.login || null,
    isFork: repo.fork,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    language: repo.language,
    languages,
    pushedAt: repo.pushed_at,
    updatedAt: repo.updated_at,
    createdAt: repo.created_at,
  };
}

function normalizeOptions(options = {}) {
  return {
    type: options.type || "all",
    ownership: (options.ownership || "all").toLowerCase(),
    visibility: (options.visibility || "all").toLowerCase(),
  };
}

function applyRepoFilters(repos, username, options) {
  const normalized = normalizeOptions(options);
  const lowerUsername = String(username).toLowerCase();

  return repos.filter((repo) => {
    const ownerLogin = String(repo.ownerLogin || "").toLowerCase();
    const isOwnedByUser = ownerLogin === lowerUsername;

    if (normalized.ownership === "own" && !isOwnedByUser) return false;
    if (
      ["fork", "forked", "clone", "cloned"].includes(normalized.ownership) &&
      !repo.isFork
    ) {
      return false;
    }

    if (normalized.visibility === "public" && repo.isPrivate) return false;
    if (normalized.visibility === "private" && !repo.isPrivate) return false;

    return true;
  });
}

async function fetchRepositoryLanguages(languagesUrl) {
  const { data } = await axios.get(languagesUrl, {
    headers: buildHeaders(),
    timeout: 10000,
  });

  return data;
}

async function fetchRepoCommitCount(fullName) {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${fullName}/commits`, {
      headers: buildHeaders(),
      timeout: 12000,
      params: { per_page: 1 },
    });

    const linkHeader = response.headers.link || "";
    const lastMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (lastMatch) return Number(lastMatch[1]);
    return Array.isArray(response.data) ? response.data.length : 0;
  } catch (error) {
    return null;
  }
}

async function fetchRepoFileSignals(fullName, defaultBranch) {
  try {
    const { data } = await axios.get(
      `${GITHUB_API_BASE}/repos/${fullName}/git/trees/${defaultBranch}`,
      {
        headers: buildHeaders(),
        timeout: 12000,
        params: { recursive: 1 },
      }
    );

    const paths = Array.isArray(data.tree)
      ? data.tree.map((item) => String(item.path || "").toLowerCase())
      : [];

    const hasDocker = paths.some((p) => p.includes("dockerfile") || p.includes("docker-compose"));
    const hasFrontendFolder = paths.some((p) =>
      p.startsWith("frontend/") ||
      p.startsWith("client/") ||
      p.startsWith("web/")
    );
    const hasBackendFolder = paths.some((p) =>
      p.startsWith("backend/") ||
      p.startsWith("server/") ||
      p.startsWith("api/")
    );
    const hasCI = paths.some((p) => p.includes(".github/workflows/"));
    const hasTerraform = paths.some((p) => p.endsWith(".tf"));
    const hasK8s = paths.some((p) => p.includes("k8s") || p.includes("kubernetes"));
    const hasPackageJson = paths.some((p) => p.endsWith("package.json"));
    const hasRequirements = paths.some((p) => p.endsWith("requirements.txt"));

    return {
      hasDocker,
      hasFrontendFolder,
      hasBackendFolder,
      hasCI,
      hasTerraform,
      hasK8s,
      hasPackageJson,
      hasRequirements,
      fileCount: paths.length,
    };
  } catch (error) {
    return {
      hasDocker: false,
      hasFrontendFolder: false,
      hasBackendFolder: false,
      hasCI: false,
      hasTerraform: false,
      hasK8s: false,
      hasPackageJson: false,
      hasRequirements: false,
      fileCount: 0,
    };
  }
}

async function fetchAuthenticatedUser() {
  const { data } = await axios.get(`${GITHUB_API_BASE}/user`, {
    headers: buildHeaders(),
    timeout: 10000,
  });
  return data;
}

async function fetchAllRepoPages(url, params) {
  const allRepos = [];
  let page = 1;
  const perPage = 100;

  while (page <= 10) {
    const { data } = await axios.get(url, {
      headers: buildHeaders(),
      timeout: 15000,
      params: {
        ...params,
        per_page: perPage,
        page,
      },
    });

    allRepos.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }

  return allRepos;
}

async function fetchUserRepositories(username, options = {}) {
  const normalized = normalizeOptions(options);
  let endpoint = `${GITHUB_API_BASE}/users/${username}/repos`;
  let params = {
    sort: "updated",
    direction: "desc",
    type: ["all", "owner", "member"].includes(normalized.type)
      ? normalized.type
      : "all",
  };

  if (process.env.GITHUB_TOKEN && normalized.visibility === "private") {
    try {
      const authUser = await fetchAuthenticatedUser();
      if (String(authUser.login).toLowerCase() === String(username).toLowerCase()) {
        endpoint = `${GITHUB_API_BASE}/user/repos`;
        params = {
          sort: "updated",
          direction: "desc",
          visibility: "private",
          affiliation: "owner,collaborator,organization_member",
        };
      }
    } catch (error) {
      endpoint = `${GITHUB_API_BASE}/users/${username}/repos`;
    }
  }

  let repos;
  try {
    repos = await fetchAllRepoPages(endpoint, params);
  } catch (error) {
    const status = error.response?.status;
    if (status === 404 || status === 422) {
      const orgEndpoint = `${GITHUB_API_BASE}/orgs/${username}/repos`;
      const orgParams = {
        sort: "updated",
        direction: "desc",
        type: "all",
      };
      repos = await fetchAllRepoPages(orgEndpoint, orgParams);
    } else {
      throw error;
    }
  }

  const enrichedRepos = await Promise.all(
    repos.map(async (repo) => {
      let languages = {};
      try {
        languages = await fetchRepositoryLanguages(repo.languages_url);
      } catch (error) {
        languages = { error: "Unable to fetch languages" };
      }

      const [commitCount, fileSignals] = await Promise.all([
        fetchRepoCommitCount(repo.full_name),
        fetchRepoFileSignals(repo.full_name, repo.default_branch),
      ]);

      return {
        ...mapRepository(repo, languages),
        commitCount,
        fileSignals,
      };
    })
  );

  return applyRepoFilters(enrichedRepos, username, normalized);
}

async function fetchUserProfile(username) {
  const { data } = await axios.get(`${GITHUB_API_BASE}/users/${username}`, {
    headers: buildHeaders(),
    timeout: 10000,
  });

  return {
    githubId: data.id,
    username: data.login,
    profileUrl: data.html_url,
    avatarUrl: data.avatar_url,
  };
}

module.exports = {
  fetchUserRepositories,
  fetchUserProfile,
};
