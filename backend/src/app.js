const express = require("express");
const cors = require("cors");
const pinoHttp = require("pino-http");
const logger = require("./utils/logger");
const optionalApiKey = require("./middleware/optionalApiKey");
const { createApiLimiter } = require("./middleware/apiRateLimit");
const githubRoutes = require("./routes/githubRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

const app = express();
const apiLimiter = createApiLimiter();

if (process.env.CORS_ORIGIN) {
  const origins = process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: origins.length === 1 ? origins[0] : origins,
      credentials: true,
    })
  );
} else {
  app.use(cors());
}

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/health" },
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "github-intelligence-backend" });
});

app.use("/api", optionalApiKey);
app.use("/api", apiLimiter);

app.use("/api/github", githubRoutes);
app.use("/api/analysis", analysisRoutes);

module.exports = app;
