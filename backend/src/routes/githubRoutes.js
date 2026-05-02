const express = require("express");
const githubController = require("../controllers/githubController");

const router = express.Router();

router.get("/:username/repos", githubController.getUserRepositories);
router.get("/:username/repos/scored", githubController.getScoredRepositories);

module.exports = router;
