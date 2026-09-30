import mongoose from "mongoose";
import dotenv from "dotenv";
import { seed } from "../shared/backend/seed.js";
const mode = process.argv[2];
if (!["vulnerable", "hardened"].includes(mode))
  throw new Error("Choose vulnerable or hardened");
dotenv.config({ path: mode + "/backend/.env", quiet: true });
let connection;
try {
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI");
  connection = await mongoose
    .createConnection(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    })
    .asPromise();
  await seed(connection, process.env.DEMO_PASSWORD);
  console.log(
    "Seeded fake user and admin for " +
      mode +
      "; existing demo passwords updated.",
  );
} catch {
  console.error(
    "Seed failed. Check local MongoDB, MONGODB_URI and DEMO_PASSWORD (12-72 bytes).",
  );
  process.exitCode = 1;
} finally {
  await connection?.close();
}
