import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { spawn } from "node:child_process";
import { fixture } from "./fixture.js";
let lab;
before(async () => {
  lab = await fixture();
});
after(async () => {
  await lab?.close();
});
for (const mode of ["vulnerable", "hardened"]) {
  test(
    mode +
      ": real MongoDB, authentication, injection, stored comments and roles",
    async () => {
      const api = request(lab.apps[mode]);
      assert.equal(
        (await api.get("/api/health").expect(200)).body.database,
        "connected",
      );
      await api.get("/api/admin/demo").expect(401);
      await api
        .post("/api/users/search")
        .send({ email: "user@example.local" })
        .expect(401);
      await api
        .post("/api/login")
        .send({ email: { $ne: null }, password: lab.password })
        .expect(400);
      await api
        .post("/api/login")
        .send({ email: "user@example.local", password: "wrong" })
        .expect(401);
      const login = await api
        .post("/api/login")
        .send({ email: "user@example.local", password: lab.password })
        .expect(200);
      const auth = "Bearer " + login.body.token;
      const users = await api
        .post("/api/users/search")
        .set("Authorization", auth)
        .send({ email: "user@example.local" })
        .expect(200);
      assert.equal(users.body.users.length, 1);
      assert.equal(users.body.users[0].passwordHash, undefined);
      const operator = await api
        .post("/api/users/search")
        .set("Authorization", auth)
        .send({ email: { $ne: null } })
        .expect(mode === "hardened" ? 400 : 200);
      if (mode === "vulnerable") assert.equal(operator.body.users.length, 2);
      if (mode === "hardened")
        for (const body of [
          {},
          { email: null },
          { email: [] },
          { email: "" },
          { email: "user@example.local", role: "admin" },
        ])
          await api
            .post("/api/users/search")
            .set("Authorization", auth)
            .send(body)
            .expect(400);
      await api
        .get("/api/admin/demo")
        .set("Authorization", auth)
        .expect(mode === "hardened" ? 403 : 200);
      const admin = await api
        .post("/api/login")
        .send({ email: "admin@example.local", password: lab.password })
        .expect(200);
      await api
        .get("/api/admin/demo")
        .set("Authorization", "Bearer " + admin.body.token)
        .expect(200);
      await api
        .get("/api/admin/demo")
        .set("Authorization", "Bearer " + login.body.token + "tampered")
        .expect(401);
      const claims = jwt.decode(login.body.token);
      const expired = jwt.sign({}, lab.secret, {
        subject: claims.sub,
        issuer: "secpair",
        audience: mode,
        expiresIn: -1,
      });
      await api
        .get("/api/admin/demo")
        .set("Authorization", "Bearer " + expired)
        .expect(401);
      const other = mode === "hardened" ? "vulnerable" : "hardened";
      await request(lab.apps[other])
        .get("/api/admin/demo")
        .set("Authorization", auth)
        .expect(401);
      const content =
        '<img src="data:," onerror="document.body.textContent=\'Local XSS executed\'">';
      await api.post("/api/comments").send({ content }).expect(401);
      await api
        .post("/api/comments")
        .set("Authorization", auth)
        .send({ content })
        .expect(201);
      const stored = await api.get("/api/comments").expect(200);
      assert.equal(stored.body.comments[0].content, content);
      for (const content of ["", {}, "x".repeat(2001)])
        await api
          .post("/api/comments")
          .set("Authorization", auth)
          .send({ content })
          .expect(400);
      await api
        .post("/api/comments")
        .set("Content-Type", "application/json")
        .send("{broken")
        .expect(400);
      await api
        .post("/api/comments")
        .send({ content: "x".repeat(9000) })
        .expect(413);
      // Stored roles, rather than client-provided roles, determine authorization.
      const User = lab.connections[mode === "vulnerable" ? 0 : 1].model("User");
      const account = await User.findOne({ email: "admin@example.local" });
      assert.notEqual(account.passwordHash, lab.password);
      assert.match(account.passwordHash, /^\$2/);
      await User.updateOne({ _id: account._id }, { $set: { role: "user" } });
      await api
        .get("/api/admin/demo")
        .set("Authorization", "Bearer " + admin.body.token)
        .expect(mode === "hardened" ? 403 : 200);
    },
  );
}
test("both server entrypoints start and respond to real curl requests", async () => {
  const curl = async (url, body, token) =>
    new Promise((resolve, reject) => {
      const args = [
        "--silent",
        "--show-error",
        "--max-time",
        "5",
        "--write-out",
        "\n%{http_code}",
        url,
      ];
      if (body)
        args.push(
          "-H",
          "Content-Type: application/json",
          "--data-binary",
          "@-",
        );
      if (token) args.push("-H", "Authorization: Bearer " + token);
      const child = spawn(
        process.platform === "win32" ? "curl.exe" : "curl",
        args,
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(stderr));
        const split = stdout.lastIndexOf("\n");
        try {
          resolve({
            status: Number(stdout.slice(split + 1)),
            body: JSON.parse(stdout.slice(0, split)),
          });
        } catch (error) {
          reject(error);
        }
      });
      child.stdin.end(body ? JSON.stringify(body) : undefined);
    });
  for (const mode of ["vulnerable", "hardened"]) {
    const child = spawn(process.execPath, [mode + "/backend/src/server.js"], {
      env: {
        ...process.env,
        MONGODB_URI: lab.uri(mode),
        JWT_SECRET: lab.secret,
        PORT: "0",
      },
    });
    try {
      // PORT=0 asks the OS for a free port; startup logs the actual bound address.
      const base = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Startup timed out")),
          15000,
        );
        child.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("Server exited before startup"));
        });
        child.stdout.on("data", (data) => {
          const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
          if (match) {
            clearTimeout(timer);
            resolve(match[0]);
          }
        });
      });
      assert.equal((await curl(base + "/api/health")).status, 200);
      const login = await curl(base + "/api/login", {
        email: "user@example.local",
        password: lab.password,
      });
      assert.equal(login.status, 200);
      const token = login.body.token;
      const result = await curl(
        base + "/api/users/search",
        { email: { $ne: null } },
        token,
      );
      assert.equal(result.status, mode === "vulnerable" ? 200 : 400);
      if (mode === "vulnerable") assert.equal(result.body.users.length, 2);
      assert.equal((await curl(base + "/api/admin/demo")).status, 401);
      assert.equal(
        (await curl(base + "/api/admin/demo", null, token)).status,
        mode === "vulnerable" ? 200 : 403,
      );
      assert.equal(
        (
          await curl(
            base + "/api/comments",
            { content: "curl local persistence check" },
            token,
          )
        ).status,
        201,
      );
      assert.equal(
        (await curl(base + "/api/comments")).body.comments[0].content,
        "curl local persistence check",
      );
    } finally {
      const done = new Promise((resolve) => child.once("exit", resolve));
      if (child.exitCode === null) {
        child.kill();
        await done;
      }
    }
  }
});
test("database loss produces a 503 instead of buffered requests", async () => {
  await lab.connections[1].close();
  await request(lab.apps.hardened).get("/api/health").expect(503);
  await request(lab.apps.hardened).get("/api/comments").expect(503);
});
test("server fails cleanly when MongoDB is unavailable", async () => {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["hardened/backend/src/server.js"], {
      env: {
        ...process.env,
        JWT_SECRET: lab.secret,
        MONGODB_URI: "mongodb://127.0.0.1:1/unavailable",
      },
      timeout: 12000,
    });
    let output = "";
    child.stderr.on("data", (data) => (output += data));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  assert.equal(result.code, 1);
  assert.match(result.output, /Startup failed/);
  assert.doesNotMatch(result.output, /at .*\.js/);
});
