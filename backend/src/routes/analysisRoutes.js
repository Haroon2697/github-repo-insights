const express = require("express");
const analysisController = require("../controllers/analysisController");

const router = express.Router();

router.get("/:username/repos", analysisController.getStoredRankedRepositories);
router.get("/:username/summary", analysisController.getAnalysisSummary);
router.get(
  "/:username/classifications",
  analysisController.getClassificationInsights
);
router.get(
  "/:username/repos/:githubRepoId",
  analysisController.getRepositoryAnalysisDetails
);
router.post(
  "/:username/repos/:githubRepoId/ai-insights",
  analysisController.generateRepositoryAIInsights
);

module.exports = router;
