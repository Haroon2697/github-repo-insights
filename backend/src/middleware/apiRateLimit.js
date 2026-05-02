const rateLimit = require("express-rate-limit");

function createApiLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || "200", 10);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });
}

module.exports = { createApiLimiter };
