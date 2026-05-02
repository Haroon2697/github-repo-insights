require("dotenv").config();

if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });
  } catch (err) {
    console.warn("Sentry init skipped:", err.message);
  }
}

const app = require("./app");
const connectDatabase = require("./config/db");
const logger = require("./utils/logger");

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
  try {
    await connectDatabase();
    logger.info(
      {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || "development",
        githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
      },
      "Server starting"
    );
    app.listen(PORT, "0.0.0.0", () => {
      logger.info({ port: PORT }, "Server listening");
    });
  } catch (error) {
    if (process.env.SENTRY_DSN) {
      try {
        require("@sentry/node").captureException(error);
      } catch (_e) {
        /* ignore */
      }
    }
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

bootstrap();
