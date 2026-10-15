const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const { createApp } = require("../src/app");
const { initializeDatabase } = require("../src/db");

test("register, login, and sliding JWT refresh flow", async () => {
  process.env.JWT_SECRET = "test-secret";

  const db = initializeDatabase(":memory:");
  await db.migrate();
  const app = createApp(db);

  const registerRes = await request(app)
    .post("/users/register")
    .send({ username: "alice", password: "password123" });
  assert.equal(registerRes.status, 201);

  const stored = await db.get("SELECT password_hash FROM users WHERE username = ?", ["alice"]);
  assert.ok(stored.password_hash);
  assert.notEqual(stored.password_hash, "password123");

  const loginRes = await request(app)
    .post("/auth/login")
    .send({ username: "alice", password: "password123" });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);

  const meRes = await request(app)
    .get("/auth/me")
    .set("Authorization", "Bearer " + loginRes.body.token);
  assert.equal(meRes.status, 200);
  assert.ok(meRes.headers["x-refresh-token"]);
  assert.ok(meRes.body.token);

  const decoded = jwt.verify(meRes.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.username, "alice");

  await db.close();
});
