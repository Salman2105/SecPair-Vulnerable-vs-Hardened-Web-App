import mongoose from "mongoose";
export function models(connection) {
  const User =
    connection.models.User ||
    connection.model(
      "User",
      new mongoose.Schema({
        email: { type: String, unique: true },
        passwordHash: String,
        role: { type: String, enum: ["user", "admin"] },
      }),
    );
  const Comment =
    connection.models.Comment ||
    connection.model(
      "Comment",
      new mongoose.Schema({ content: String }, { timestamps: true }),
    );
  return { User, Comment };
}
