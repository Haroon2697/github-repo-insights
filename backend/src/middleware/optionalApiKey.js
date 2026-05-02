/**
 * When BACKEND_API_KEY is set, all /api/* requests must send:
 *   Header: X-Backend-Api-Key: <same value>
 * (Never put this key in public frontend env for a truly public site — use a BFF or IP allowlist.)
 */
function optionalApiKey(req, res, next) {
  const expected = process.env.BACKEND_API_KEY;
  if (!expected) return next();

  const sent =
    req.get("x-backend-api-key") ||
    req.get("X-Backend-Api-Key") ||
    req.query.apiKey;

  if (sent === expected) return next();
  return res.status(401).json({ error: "Invalid or missing API key" });
}

module.exports = optionalApiKey;
