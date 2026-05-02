const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    githubId: { type: Number, required: true, unique: true },
    username: { type: String, required: true, unique: true, index: true },
    profileUrl: { type: String },
    avatarUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
