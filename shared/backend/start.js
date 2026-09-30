import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
export async function start(createApp, mode, envUrl) {
  dotenv.config({ path: fileURLToPath(envUrl), quiet: true });
  let connection;
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
      throw new Error(
        "Set JWT_SECRET to a random value of at least 32 characters",
      );
    if (!process.env.MONGODB_URI)
      throw new Error("Set MONGODB_URI to your local MongoDB database");
    connection = await mongoose
      .createConnection(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        bufferCommands: false,
      })
      .asPromise();
    const port = Number(
      process.env.PORT || (mode === "vulnerable" ? 4001 : 4002),
    );
    const app = createApp({ connection, secret: process.env.JWT_SECRET });
    const server = app.listen(port, "127.0.0.1", () =>
      console.log(mode + " API: http://127.0.0.1:" + server.address().port),
    );
    server.on("error", async () => {
      console.error("Unable to listen; check PORT is available.");
      await connection.close();
      process.exitCode = 1;
    });
    const close = () =>
      server.close(async () => {
        await connection.close();
        process.exit(0);
      });
    process.on("SIGINT", close);
    process.on("SIGTERM", close);
  } catch (error) {
    console.error(
      "Startup failed: " +
        (connection
          ? error.message
          : "Check JWT_SECRET, MONGODB_URI and that local MongoDB is running."),
    );
    await connection?.close();
    process.exitCode = 1;
  }
}
