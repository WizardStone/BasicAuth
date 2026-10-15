const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const defaultJwtSecret = "dev-only-secret-change-me";

function signToken(user, jwtSecret, jwtExpirySeconds) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    jwtSecret,
    { expiresIn: jwtExpirySeconds }
  );
}

function createApp(db) {
  const jwtSecret = process.env.JWT_SECRET || defaultJwtSecret;
  const jwtExpirySeconds = Number(process.env.JWT_EXPIRY_SECONDS || 900);
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/users/register", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const existing = await db.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(409).json({ error: "username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.run(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, passwordHash]
    );

    return res.status(201).json({ id: result.lastID, username });
  });

  app.post("/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const user = await db.get(
      "SELECT id, username, password_hash FROM users WHERE username = ?",
      [username]
    );
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = signToken(user, jwtSecret, jwtExpirySeconds);
    return res.json({
      token,
      tokenType: "Bearer",
      expiresIn: jwtExpirySeconds
    });
  });

  async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "missing bearer token" });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      const refreshedToken = signToken(
        { id: decoded.sub, username: decoded.username },
        jwtSecret,
        jwtExpirySeconds
      );
      res.set("X-Refresh-Token", refreshedToken);
      res.locals.refreshedToken = refreshedToken;
      return next();
    } catch (_err) {
      return res.status(401).json({ error: "invalid or expired token" });
    }
  }

  app.get("/auth/me", authenticate, async (req, res) => {
    const user = await db.get("SELECT id, username FROM users WHERE id = ?", [req.user.sub]);
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    return res.json({
      user,
      token: res.locals.refreshedToken,
      tokenType: "Bearer",
      expiresIn: jwtExpirySeconds
    });
  });

  return app;
}

module.exports = { createApp };
