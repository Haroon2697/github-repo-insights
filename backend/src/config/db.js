const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured in environment variables");
  }

  await mongoose.connect(mongoUri);
  logger.info("MongoDB connected");
}

module.exports = connectDatabase;
