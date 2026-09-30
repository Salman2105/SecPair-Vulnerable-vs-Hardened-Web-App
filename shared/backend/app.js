import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { models } from "./models.js";
import { requireAuth } from "./auth.js";
export function createLab({ connection, secret, mode, demoRoutes }) {
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const app = express();
  const { User, Comment } = models(connection);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  app.get("/api/health", (_req, res) =>
    res.status(connection.readyState === 1 ? 200 : 503).json({
      mode,
      database: connection.readyState === 1 ? "connected" : "unavailable",
    }),
  );
  app.use("/api", (_req, res, next) =>
    connection.readyState === 1
      ? next()
      : res.status(503).json({ error: "Database unavailable" }),
  );
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      Buffer.byteLength(password) > 72
    )
      return res.status(400).json({
        error: "Email and password must be strings within the length limits",
      });
    const user = await User.findOne({ email: { $eq: email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({}, secret, {
      subject: String(user._id),
      algorithm: "HS256",
      expiresIn: "15m",
      issuer: "secpair",
      audience: mode,
    });
    res.json({ token, role: user.role });
  });
  app.use(
    "/api",
    demoRoutes({ User, Comment, auth: requireAuth(User, secret, mode) }),
  );
  app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON" });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request too large" });
    if (err.name === "CastError" || err.name === "ValidationError")
      return res.status(400).json({ error: "Invalid input" });
    res.status(500).json({ error: "Unexpected server error" });
  });
  return app;
}
