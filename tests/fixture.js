import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { seed } from "../shared/backend/seed.js";
import { createApp as vulnerable } from "../vulnerable/backend/src/app.js";
import { createApp as hardened } from "../hardened/backend/src/app.js";
export async function fixture() {
  const mongo = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1" },
  });
  const password = randomBytes(18).toString("hex"),
    secret = randomBytes(32).toString("hex");
  const connections = [],
    apps = {};
  try {
    for (const [mode, createApp] of Object.entries({ vulnerable, hardened })) {
      const connection = await mongoose
        .createConnection(mongo.getUri("secpair_test_" + mode), {
          bufferCommands: false,
        })
        .asPromise();
      connections.push(connection);
      await seed(connection, password);
      apps[mode] = createApp({ connection, secret });
    }
  } catch (error) {
    await Promise.all(connections.map((c) => c.close()));
    await mongo.stop();
    throw error;
  }
  return {
    apps,
    password,
    secret,
    connections,
    uri: (mode) => mongo.getUri("secpair_test_" + mode),
    close: async () => {
      await Promise.all(connections.map((c) => c.close()));
      await mongo.stop();
    },
  };
}
