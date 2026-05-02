const { describe, test } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");

describe("app", () => {
  test("GET /health", async () => {
    const res = await request(app).get("/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.service, "github-intelligence-backend");
  });
});
