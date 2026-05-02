const axios = require("axios");
const githubService = require("../services/githubService");
const analysisEngine = require("../services/analysisEngine");
const User = require("../models/User");
const Repository = require("../models/Repository");
const AnalysisResult = require("../models/AnalysisResult");
const redisCache = require("../services/redisCache");

function buildRepoFilters(query) {
  return {
    type: query.type || "all",
    ownership: query.ownership || "all",
    visibility: query.visibility || "all",
  };
}

async function getUserRepositories(req, res) {
  try {
    const { username } = req.params;
    const filters = buildRepoFilters(req.query);
    const userProfile = await githubService.fetchUserProfile(username);
    const repositories = await githubService.fetchUserRepositories(
      username,
      filters
    );

    const userDoc = await User.findOneAndUpdate(
      { githubId: userProfile.githubId },
      userProfile,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Promise.all(
      repositories.map((repo) =>
        Repository.findOneAndUpdate(
          { githubId: repo.githubId },
          {
            user: userDoc._id,
            githubId: repo.githubId,
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            htmlUrl: repo.htmlUrl,
            defaultBranch: repo.defaultBranch,
            visibility: repo.visibility,
            isPrivate: repo.isPrivate,
            ownerLogin: repo.ownerLogin,
            isFork: repo.isFork,
            stars: repo.stars,
            forks: repo.forks,
            openIssues: repo.openIssues,
            language: repo.language,
            languages: repo.languages,
            pushedAt: repo.pushedAt,
            githubUpdatedAt: repo.updatedAt,
            githubCreatedAt: repo.createdAt,
            commitCount: repo.commitCount || 0,
            fileSignals: repo.fileSignals || {},
            rawPayload: repo,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    res.json({
      username,
      user: userProfile,
      filters,
      count: repositories.length,
      repositories,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.message || "GitHub API request failed";
      return res.status(status).json({ error: message });
    }

    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getUserRepositories,
  async getScoredRepositories(req, res) {
    try {
      const { username } = req.params;
      const filters = buildRepoFilters(req.query);
      const userProfile = await githubService.fetchUserProfile(username);
      const repositories = await githubService.fetchUserRepositories(
        username,
        filters
      );
      const scored = analysisEngine.scoreRepositories(repositories);

      const userDoc = await User.findOneAndUpdate(
        { githubId: userProfile.githubId },
        userProfile,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await Promise.all(
        scored.map(async (repo) => {
          const repoDoc = await Repository.findOneAndUpdate(
            { githubId: repo.githubId },
            {
              user: userDoc._id,
              githubId: repo.githubId,
              name: repo.name,
              fullName: repo.fullName,
              description: repo.description,
              htmlUrl: repo.htmlUrl,
              defaultBranch: repo.defaultBranch,
              visibility: repo.visibility,
              isPrivate: repo.isPrivate,
              ownerLogin: repo.ownerLogin,
              isFork: repo.isFork,
              stars: repo.stars,
              forks: repo.forks,
              openIssues: repo.openIssues,
              language: repo.language,
              languages: repo.languages,
              pushedAt: repo.pushedAt,
              githubUpdatedAt: repo.updatedAt,
              githubCreatedAt: repo.createdAt,
              commitCount: repo.commitCount || 0,
              fileSignals: repo.fileSignals || {},
              rawPayload: repo,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          await AnalysisResult.findOneAndUpdate(
            { user: userDoc._id, githubRepoId: repo.githubId },
            {
              user: userDoc._id,
              repository: repoDoc._id,
              githubRepoId: repo.githubId,
              finalScore: repo.finalScore,
              breakdown: repo.breakdown,
              flags: repo.flags,
              tags: repo.tags,
              classification: repo.classification,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        })
      );

      await redisCache.invalidateUserAnalysisCache(username);

      res.json({
        username,
        user: userProfile,
        filters,
        count: scored.length,
        repositories: scored,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message =
          error.response?.data?.message || "GitHub API request failed";
        return res.status(status).json({ error: message });
      }
      return res.status(500).json({ error: error.message });
    }
  },
};
