const crypto = require("crypto");
const logger = require("../utils/logger");

let client = null;

function getClient() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  try {
    const Redis = require("ioredis");
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
    });
    client.on("error", (err) => logger.warn({ err: err.message }, "Redis error"));
    return client;
  } catch (err) {
    logger.warn({ err: err.message }, "Redis unavailable");
    return null;
  }
}

function cacheTtlSeconds() {
  return Math.max(30, parseInt(process.env.REDIS_CACHE_TTL_SEC || "120", 10));
}

function summaryCacheKey(username) {
  return `ghintel:summary:${String(username).toLowerCase()}`;
}

function reposListCacheKey(username, filters) {
  const h = crypto
    .createHash("sha256")
    .update(JSON.stringify(filters))
    .digest("hex")
    .slice(0, 32);
  return `ghintel:repos:${String(username).toLowerCase()}:${h}`;
}

async function getJson(key) {
  const r = getClient();
  if (!r) return null;
  try {
    const s = await r.get(key);
    if (!s) return null;
    return JSON.parse(s);
  } catch (err) {
    logger.warn({ err: err.message, key }, "Redis get failed");
    return null;
  }
}

async function setJson(key, value, ttlSec = cacheTtlSeconds()) {
  const r = getClient();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch (err) {
    logger.warn({ err: err.message, key }, "Redis set failed");
  }
}

async function del(key) {
  const r = getClient();
  if (!r) return;
  try {
    await r.del(key);
  } catch (err) {
    logger.warn({ err: err.message, key }, "Redis del failed");
  }
}

async function delReposKeysForUser(username) {
  const r = getClient();
  if (!r) return;
  const pattern = `ghintel:repos:${String(username).toLowerCase()}:*`;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await r.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length) await r.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    logger.warn({ err: err.message }, "Redis scan del failed");
  }
}

async function invalidateUserAnalysisCache(username) {
  await del(summaryCacheKey(username));
  await delReposKeysForUser(username);
}

module.exports = {
  getJson,
  setJson,
  del,
  summaryCacheKey,
  reposListCacheKey,
  invalidateUserAnalysisCache,
  cacheTtlSeconds,
};
