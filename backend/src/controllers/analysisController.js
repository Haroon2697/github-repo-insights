const User = require("../models/User");
const AnalysisResult = require("../models/AnalysisResult");
const aiInsightsService = require("../services/aiInsightsService");
const redisCache = require("../services/redisCache");

function buildFilters(query) {
  return {
    ownership: (query.ownership || "all").toLowerCase(),
    visibility: (query.visibility || "all").toLowerCase(),
    type: (query.type || "all").toLowerCase(),
    tag: (query.tag || "").toLowerCase(),
    sortBy: (query.sortBy || "score").toLowerCase(),
    sortOrder: (query.sortOrder || "desc").toLowerCase(),
    minScore: Number(query.minScore || 0),
    limit: Math.min(Number(query.limit || 200), 500),
  };
}

function applyFilters(items, username, filters) {
  const usernameLower = username.toLowerCase();
  return items.filter((item) => {
    const repo = item.repository;
    const ownerLogin = String(repo.ownerLogin || "").toLowerCase();
    const fullName = String(repo.fullName || "").toLowerCase();
    const isOwnedByUser =
      ownerLogin === usernameLower || fullName.startsWith(`${usernameLower}/`);

    if (filters.ownership === "own" && repo.isFork) return false;
    if (
      ["fork", "forked", "clone", "cloned"].includes(filters.ownership) &&
      !repo.isFork
    ) {
      return false;
    }

    if (filters.type === "owner" && !isOwnedByUser) return false;
    if (filters.type === "member" && isOwnedByUser) return false;

    if (filters.visibility === "public" && repo.isPrivate) return false;
    if (filters.visibility === "private" && !repo.isPrivate) return false;

    if (filters.tag && !(item.tags || []).map((t) => t.toLowerCase()).includes(filters.tag)) {
      return false;
    }

    if (item.finalScore < filters.minScore) return false;
    return true;
  });
}

function applySorting(items, filters) {
  const direction = filters.sortOrder === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (filters.sortBy === "updated") {
      const aTime = new Date(a.repository.githubUpdatedAt || 0).getTime();
      const bTime = new Date(b.repository.githubUpdatedAt || 0).getTime();
      return (aTime - bTime) * direction;
    }
    if (filters.sortBy === "stars") {
      return (a.repository.stars - b.repository.stars) * direction;
    }
    return (a.finalScore - b.finalScore) * direction;
  });
}

async function getStoredRankedRepositories(req, res) {
  try {
    const { username } = req.params;
    const filters = buildFilters(req.query);

    const listKey = redisCache.reposListCacheKey(username, filters);
    const cachedList = await redisCache.getJson(listKey);
    if (cachedList) {
      return res.json({ ...cachedList, source: "redis" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        error: "User not found in database. Run scored endpoint first.",
      });
    }

    const rows = await AnalysisResult.find({ user: user._id })
      .populate("repository")
      .lean();

    const withRepo = rows.filter((row) => Boolean(row.repository));
    const filtered = applyFilters(withRepo, username, filters);
    const sorted = applySorting(filtered, filters).slice(0, filters.limit);

    const repositories = sorted.map((row) => ({
      githubId: row.githubRepoId,
      finalScore: row.finalScore,
      breakdown: row.breakdown,
      flags: row.flags,
      tags: row.tags || [],
      classification: row.classification || {},
      ...row.repository,
    }));

    const payload = {
      username,
      source: "database",
      filters,
      count: repositories.length,
      repositories,
    };
    await redisCache.setJson(listKey, payload);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAnalysisSummary(req, res) {
  try {
    const { username } = req.params;

    const summaryKey = redisCache.summaryCacheKey(username);
    const cachedSummary = await redisCache.getJson(summaryKey);
    if (cachedSummary) {
      return res.json({ ...cachedSummary, source: "redis-cache" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        error: "User not found in database. Run scored endpoint first.",
      });
    }

    const rows = await AnalysisResult.find({ user: user._id })
      .populate("repository")
      .lean();
    const valid = rows.filter((row) => Boolean(row.repository));

    const total = valid.length;
    const avgScore =
      total === 0
        ? 0
        : Number(
            (
              valid.reduce((sum, item) => sum + Number(item.finalScore || 0), 0) / total
            ).toFixed(2)
          );

    const tagCounts = {};
    const classificationCounts = {
      fullstack: 0,
      ai: 0,
      backendHeavy: 0,
      devops: 0,
    };
    const languageCounts = {};
    let topRepo = null;
    for (const row of valid) {
      if (!topRepo || row.finalScore > topRepo.finalScore) {
        topRepo = row;
      }
      for (const tag of row.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
      if (row.classification?.isFullStackProject) classificationCounts.fullstack += 1;
      if (row.classification?.isAIProject) classificationCounts.ai += 1;
      if (row.classification?.isBackendHeavy) classificationCounts.backendHeavy += 1;
      if (row.classification?.isDevOpsProject) classificationCounts.devops += 1;
      const lang = row.repository.language || "Unknown";
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }

    const payload = {
      username,
      source: "database",
      totalRepositories: total,
      averageScore: avgScore,
      topRepository: topRepo
        ? {
            name: topRepo.repository.name,
            fullName: topRepo.repository.fullName,
            finalScore: topRepo.finalScore,
            tags: topRepo.tags || [],
          }
        : null,
      tagDistribution: tagCounts,
      classificationDistribution: classificationCounts,
      languageDistribution: languageCounts,
    };
    await redisCache.setJson(summaryKey, payload);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getRepositoryAnalysisDetails(req, res) {
  try {
    const { username, githubRepoId } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        error: "User not found in database. Run scored endpoint first.",
      });
    }

    const row = await AnalysisResult.findOne({
      user: user._id,
      githubRepoId: Number(githubRepoId),
    })
      .populate("repository")
      .lean();

    if (!row || !row.repository) {
      return res.status(404).json({
        error: "Repository analysis not found in database for this user.",
      });
    }

    return res.json({
      username,
      source: "database",
      repository: {
        githubId: row.githubRepoId,
        finalScore: row.finalScore,
        breakdown: row.breakdown,
        flags: row.flags,
        tags: row.tags || [],
        classification: row.classification || {},
        aiInsights: row.aiInsights || null,
        ...row.repository,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getClassificationInsights(req, res) {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        error: "User not found in database. Run scored endpoint first.",
      });
    }

    const rows = await AnalysisResult.find({ user: user._id })
      .populate("repository")
      .lean();
    const valid = rows.filter((row) => Boolean(row.repository));

    const classifications = {
      fullstack: [],
      ai: [],
      backendHeavy: [],
      devops: [],
    };

    for (const row of valid) {
      const base = {
        githubId: row.githubRepoId,
        name: row.repository.name,
        fullName: row.repository.fullName,
        finalScore: row.finalScore,
        tags: row.tags || [],
      };
      if (row.classification?.isFullStackProject) classifications.fullstack.push(base);
      if (row.classification?.isAIProject) classifications.ai.push(base);
      if (row.classification?.isBackendHeavy) classifications.backendHeavy.push(base);
      if (row.classification?.isDevOpsProject) classifications.devops.push(base);
    }

    return res.json({
      username,
      source: "database",
      counts: {
        fullstack: classifications.fullstack.length,
        ai: classifications.ai.length,
        backendHeavy: classifications.backendHeavy.length,
        devops: classifications.devops.length,
      },
      repositories: classifications,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function generateRepositoryAIInsights(req, res) {
  try {
    const { username, githubRepoId } = req.params;
    const force = String(req.query.force || "false").toLowerCase() === "true";

    if (!aiInsightsService.hasAnyAiProvider()) {
      return res.status(400).json({
        error:
          "No AI provider keys configured. Add at least one in backend/.env: GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY. Optional: AI_PROVIDER_ORDER=groq,openrouter,openai,huggingface",
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        error: "User not found in database. Run scored endpoint first.",
      });
    }

    const row = await AnalysisResult.findOne({
      user: user._id,
      githubRepoId: Number(githubRepoId),
    })
      .populate("repository")
      .lean();

    if (!row || !row.repository) {
      return res.status(404).json({
        error: "Repository analysis not found in database for this user.",
      });
    }

    if (row.aiInsights && !force) {
      return res.json({
        username,
        source: "database-cache",
        githubRepoId: Number(githubRepoId),
        aiInsights: row.aiInsights,
      });
    }

    const aiInsights = await aiInsightsService.generateRepositoryInsights(row);

    await AnalysisResult.findOneAndUpdate(
      { user: user._id, githubRepoId: Number(githubRepoId) },
      { aiInsights },
      { new: true }
    );

    await redisCache.invalidateUserAnalysisCache(username);

    return res.json({
      username,
      source: aiInsights.provider ? `ai:${aiInsights.provider}` : "ai",
      githubRepoId: Number(githubRepoId),
      aiInsights,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getStoredRankedRepositories,
  getAnalysisSummary,
  getRepositoryAnalysisDetails,
  getClassificationInsights,
  generateRepositoryAIInsights,
};
