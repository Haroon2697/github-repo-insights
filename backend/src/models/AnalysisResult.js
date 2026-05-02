const mongoose = require("mongoose");

const analysisResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    githubRepoId: { type: Number, required: true, index: true },
    finalScore: { type: Number, required: true },
    breakdown: { type: Object, default: {} },
    flags: { type: Object, default: {} },
    tags: { type: [String], default: [] },
    classification: { type: Object, default: {} },
    aiInsights: { type: Object, default: null },
  },
  { timestamps: true }
);

analysisResultSchema.index({ user: 1, githubRepoId: 1 }, { unique: true });

module.exports = mongoose.model("AnalysisResult", analysisResultSchema);
