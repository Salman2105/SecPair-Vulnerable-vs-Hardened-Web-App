import { chromium } from "playwright";
import { createServer } from "vite";
import assert from "node:assert/strict";
import { fixture } from "../tests/fixture.js";
import { mkdir } from "node:fs/promises";
const lab = await fixture(),
  servers = [],
  vites = [];
let browser;
try {
  for (const [mode, app] of Object.entries(lab.apps)) {
    const port = mode === "vulnerable" ? 4001 : 4002;
    servers.push(
      await new Promise((resolve, reject) => {
        const s = app.listen(port, "127.0.0.1", () => resolve(s));
        s.once("error", reject);
      }),
    );
    const vite = await createServer({
      root: mode + "/frontend",
      configFile: mode + "/frontend/vite.config.js",
    });
    vites.push(vite);
    await vite.listen();
  }
  browser = await chromium.launch({ headless: true });
  for (const mode of ["vulnerable", "hardened"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      "http://127.0.0.1:" + (mode === "vulnerable" ? 5173 : 5174),
    );
    await page.getByLabel("Password", { exact: true }).fill(lab.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByText("Signed in as user", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Load operator example" }).click();
    await page.getByRole("button", { name: "Run search" }).click();
    await page.waitForFunction(
      (hard) =>
        document
          .querySelector("pre")
          .textContent.includes(hard ? "400:" : "admin@example.local"),
      mode === "hardened",
    );
    await page.getByRole("button", { name: "Request admin resource" }).click();
    await page.waitForFunction(
      (hard) =>
        document
          .querySelector("pre")
          .textContent.includes(
            hard ? "403:" : "Admin-only demonstration resource",
          ),
      mode === "hardened",
    );
    await page
      .getByRole("button", { name: "Load harmless XSS example" })
      .click();
    await page.getByRole("button", { name: "Save comment" }).click();
    await page
      .getByText("Comment saved. Reload the page to confirm persistence.", {
        exact: true,
      })
      .waitFor();
    await page.reload();
    if (mode === "vulnerable") {
      await page
        .frameLocator("iframe")
        .getByText("Local XSS executed", { exact: true })
        .waitFor();
      assert.equal(
        await page.locator("iframe").getAttribute("sandbox"),
        "allow-scripts",
      );
      assert.equal(await page.locator("h1").textContent(), "SecPair");
    } else {
      await page.locator(".comment").waitFor();
      assert.match(await page.locator(".comment").textContent(), /onerror/);
      assert.equal(await page.locator(".comment img").count(), 0);
    }
    await page.getByLabel("Account").selectOption("admin@example.local");
    await page.getByLabel("Password", { exact: true }).fill(lab.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByText("Signed in as admin", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Request admin resource" }).click();
    await page.waitForFunction(() =>
      document
        .querySelector("pre")
        .textContent.includes("Admin-only demonstration resource"),
    );
    await mkdir("test-results", { recursive: true });
    await page.screenshot({
      path: "test-results/" + mode + ".png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS " +
        mode +
        ": browser login, injection, access control, persisted XSS behavior, admin access; no page errors",
    );
    await page.close();
  }
} finally {
  await browser?.close();
  await Promise.all(vites.map((v) => v.close()));
  await Promise.all(
    servers.map((s) => new Promise((resolve) => s.close(resolve))),
  );
  await lab.close();
}
