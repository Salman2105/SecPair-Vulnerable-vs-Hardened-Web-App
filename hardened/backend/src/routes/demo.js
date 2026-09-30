import { Router } from "express";
import { requireRole } from "../../../../shared/backend/auth.js";
export function demoRoutes({ User, Comment, auth }) {
  const router = Router();
  router.post("/users/search", auth, async (req, res) => {
    const { email } = req.body || {};
    // Allow only a literal email string; never pass client operators to MongoDB.
    if (
      typeof email !== "string" ||
      !email.trim() ||
      email.length > 254 ||
      Object.keys(req.body).some((key) => key !== "email")
    )
      return res
        .status(400)
        .json({ error: "Only a nonempty email string is accepted" });
    const users = await User.find({ email: { $eq: email } })
      .select("email role -_id")
      .limit(10);
    res.json({ users });
  });
  router.get("/comments", async (_req, res) =>
    res.json({
      comments: await Comment.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .select("content createdAt"),
    }),
  );
  router.post("/comments", auth, async (req, res) => {
    const { content } = req.body || {};
    // Basic size/type limits do not prevent XSS. Rendering is the key difference.
    if (typeof content !== "string" || !content.trim() || content.length > 2000)
      return res
        .status(400)
        .json({ error: "Content must be 1-2000 characters" });
    const comment = await Comment.create({ content });
    res.status(201).json({ comment });
  });
  // Authentication AND server-side role authorization.
  router.get("/admin/demo", auth, requireRole("admin"), (_req, res) =>
    res.json({ message: "Admin-only demonstration resource" }),
  );
  return router;
}
