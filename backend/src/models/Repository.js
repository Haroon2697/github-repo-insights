const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    githubId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    description: { type: String },
    htmlUrl: { type: String, required: true },
    defaultBranch: { type: String },
    visibility: { type: String },
    isPrivate: { type: Boolean, default: false },
    ownerLogin: { type: String },
    isFork: { type: Boolean, default: false },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    openIssues: { type: Number, default: 0 },
    language: { type: String },
    languages: { type: Object, default: {} },
    pushedAt: { type: Date },
    githubUpdatedAt: { type: Date },
    githubCreatedAt: { type: Date },
    commitCount: { type: Number, default: 0 },
    fileSignals: { type: Object, default: {} },
    rawPayload: { type: Object, default: {} },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Repository", repositorySchema);
