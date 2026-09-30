// Disposable real MongoDB for local exploration; no persistent service needed.
import { fixture } from "../tests/fixture.js";
const lab = await fixture();
const servers = [];
try {
  for (const [mode, app] of Object.entries(lab.apps)) {
    const port = mode === "vulnerable" ? 4001 : 4002;
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(port, "127.0.0.1", () => resolve(s));
      s.once("error", reject);
    });
    servers.push(server);
    console.log(mode + " API: http://127.0.0.1:" + port);
  }
  console.log(
    "Temporary fake accounts: user@example.local and admin@example.local",
  );
  console.log("Generated demo password (this session only): " + lab.password);
  console.log(
    "Data is discarded on exit. Start the two frontend commands in other terminals.",
  );
} catch (error) {
  console.error("Temporary lab startup failed: " + error.message);
  await shutdown();
  process.exitCode = 1;
}
async function shutdown() {
  await Promise.all(
    servers.map((server) => new Promise((resolve) => server.close(resolve))),
  );
  await lab.close();
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await shutdown();
    process.exit(0);
  });
