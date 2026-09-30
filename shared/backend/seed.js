import bcrypt from "bcryptjs";
import { models } from "./models.js";
export async function seed(connection, password) {
  if (
    typeof password !== "string" ||
    Buffer.byteLength(password) < 12 ||
    Buffer.byteLength(password) > 72
  )
    throw new Error("DEMO_PASSWORD must be 12 to 72 bytes");
  const { User } = models(connection);
  const passwordHash = await bcrypt.hash(password, 10);
  for (const role of ["user", "admin"])
    await User.updateOne(
      { email: role + "@example.local" },
      { $set: { passwordHash, role } },
      { upsert: true },
    );
}
