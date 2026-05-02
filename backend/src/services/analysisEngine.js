const {
  FRONTEND_TECH,
  BACKEND_TECH,
  DATABASE_TECH,
  AUTH_TECH,
  DEVOPS_TECH,
  AI_TECH,
} = require("../utils/scoringRules");

function toTextBlob(repo) {
  const languages = Object.keys(repo.languages || {}).join(" ");
  const fileSignals = Object.entries(repo.fileSignals || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k)
    .join(" ");
  return `${repo.name || ""} ${repo.description || ""} ${languages} ${fileSignals}`.toLowerCase();
}

function hasAny(text, needles) {
  return needles.some((token) => text.includes(token));
}

function computeTechStackScore(text) {
  const hasFrontend = hasAny(text, FRONTEND_TECH);
  const hasBackend = hasAny(text, BACKEND_TECH);
  const hasDatabase = hasAny(text, DATABASE_TECH);
  const hasDevOps = hasAny(text, DEVOPS_TECH);
  const hasAI = hasAny(text, AI_TECH);

  let score = 0;
  if (hasFrontend && hasBackend && hasDatabase) score += 3;
  if (hasDevOps) score += 2;
  if (hasAI) score += 2;

  return {
    score,
    hasFrontend,
    hasBackend,
    hasDatabase,
    hasDevOps,
    hasAI,
  };
}

function computeArchitectureScore(text, techFlags, fileSignals = {}) {
  const hasAuth = hasAny(text, AUTH_TECH);
  const isMultiService = /(microservice|multi[- ]service|services)/i.test(text);
  const hasBackendFolder = Boolean(fileSignals.hasBackendFolder);
  const hasFrontendFolder = Boolean(fileSignals.hasFrontendFolder);

  let score = 0;
  if (techFlags.hasBackend || hasBackendFolder) score += 2;
  if (hasAuth) score += 2;
  if (isMultiService) score += 3;
  if (hasFrontendFolder && hasBackendFolder) score += 2;

  return { score, hasAuth, isMultiService, hasFrontendFolder, hasBackendFolder };
}

function computeActivityScore(repo) {
  const stars = Number(repo.stars || 0);
  const forks = Number(repo.forks || 0);
  const updatedAt = repo.updatedAt ? new Date(repo.updatedAt) : null;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const commitCount = Number(repo.commitCount || 0);

  let score = 0;
  if (commitCount > 50) score += 3;
  if (updatedAt && updatedAt > ninetyDaysAgo) score += 2;

  const popularity = Math.min((stars + forks) / 100, 10);
  return { score, popularity, commitCount };
}

function calculateLanguageWeights(languages = {}) {
  const entries = Object.entries(languages || {});
  const total = entries.reduce((sum, [, bytes]) => sum + Number(bytes || 0), 0);
  if (!total) return { backendWeight: 0, frontendWeight: 0 };

  const backendLangs = new Set([
    "javascript",
    "typescript",
    "python",
    "java",
    "c#",
    "go",
    "rust",
    "php",
    "ruby",
    "kotlin",
    "swift",
    "c++",
    "c",
  ]);
  const frontendLangs = new Set(["javascript", "typescript", "html", "css", "scss"]);

  let backendBytes = 0;
  let frontendBytes = 0;
  for (const [lang, bytes] of entries) {
    const key = String(lang).toLowerCase();
    if (backendLangs.has(key)) backendBytes += Number(bytes || 0);
    if (frontendLangs.has(key)) frontendBytes += Number(bytes || 0);
  }

  return {
    backendWeight: backendBytes / total,
    frontendWeight: frontendBytes / total,
  };
}

function deriveClassifications(flags, repo = {}, fileSignals = {}) {
  const languageWeights = calculateLanguageWeights(repo.languages);
  const isFullStackProject =
    (flags.hasFrontend || fileSignals.hasFrontendFolder) &&
    (flags.hasBackend || fileSignals.hasBackendFolder);
  const isAIProject = flags.hasAI;
  const isDevOpsProject =
    flags.hasDevOps ||
    fileSignals.hasDocker ||
    fileSignals.hasTerraform ||
    fileSignals.hasK8s ||
    fileSignals.hasCI;
  const isBackendHeavy =
    (flags.hasBackend || fileSignals.hasBackendFolder) &&
    !flags.hasFrontend &&
    (languageWeights.backendWeight >= 0.6 || !fileSignals.hasFrontendFolder);

  return {
    isFullStackProject,
    isAIProject,
    isBackendHeavy,
    isDevOpsProject,
    languageWeights: {
      backend: Number(languageWeights.backendWeight.toFixed(2)),
      frontend: Number(languageWeights.frontendWeight.toFixed(2)),
    },
  };
}

function deriveTags(flags, fileSignals = {}) {
  const tags = [];
  if ((flags.hasFrontend || fileSignals.hasFrontendFolder) && (flags.hasBackend || fileSignals.hasBackendFolder)) {
    tags.push("fullstack");
  } else if (flags.hasFrontend || fileSignals.hasFrontendFolder) {
    tags.push("frontend");
  } else if (flags.hasBackend || fileSignals.hasBackendFolder) {
    tags.push("backend");
  }

  if (flags.hasAI) tags.push("ai");
  if (
    flags.hasDevOps ||
    fileSignals.hasDocker ||
    fileSignals.hasTerraform ||
    fileSignals.hasK8s ||
    fileSignals.hasCI
  ) {
    tags.push("devops");
  }
  if (flags.hasDatabase) tags.push("data");
  return tags;
}

function calculateFinalScore(repo) {
  const text = toTextBlob(repo);
  const techStack = computeTechStackScore(text);
  const architecture = computeArchitectureScore(text, techStack, repo.fileSignals);
  const activity = computeActivityScore(repo);
  const tags = deriveTags(
    {
      hasFrontend: techStack.hasFrontend,
      hasBackend: techStack.hasBackend,
      hasDevOps: techStack.hasDevOps,
      hasAI: techStack.hasAI,
      hasDatabase: techStack.hasDatabase,
    },
    repo.fileSignals
  );
  const classification = deriveClassifications(
    {
      hasFrontend: techStack.hasFrontend,
      hasBackend: techStack.hasBackend,
      hasDevOps: techStack.hasDevOps,
      hasAI: techStack.hasAI,
    },
    repo,
    repo.fileSignals || {}
  );

  const finalScore =
    techStack.score * 0.3 +
    architecture.score * 0.4 +
    activity.score * 0.2 +
    activity.popularity * 0.1;

  return {
    finalScore: Number(finalScore.toFixed(2)),
    breakdown: {
      techStack: techStack.score,
      architecture: architecture.score,
      activity: activity.score,
      popularity: Number(activity.popularity.toFixed(2)),
      commitCount: activity.commitCount,
    },
    flags: {
      hasFrontend: techStack.hasFrontend,
      hasBackend: techStack.hasBackend,
      hasDatabase: techStack.hasDatabase,
      hasDevOps: techStack.hasDevOps,
      hasAI: techStack.hasAI,
      hasAuth: architecture.hasAuth,
      isMultiService: architecture.isMultiService,
      hasFrontendFolder: architecture.hasFrontendFolder,
      hasBackendFolder: architecture.hasBackendFolder,
    },
    tags,
    classification,
  };
}

function scoreRepositories(repositories) {
  return repositories
    .map((repo) => {
      const score = calculateFinalScore(repo);
      return { ...repo, ...score };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

module.exports = {
  calculateFinalScore,
  scoreRepositories,
};
