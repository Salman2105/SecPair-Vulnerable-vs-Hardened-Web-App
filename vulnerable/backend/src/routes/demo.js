import { Router } from "express";

export function demoRoutes({ User, Comment, auth }) {
  const router = Router();
  router.post("/users/search", auth, async (req, res) => {
    const { email } = req.body || {};
    // INTENTIONALLY INSECURE: an object such as {$ne:null} changes the query.
    // Only the email field is exposed; no arbitrary pipeline or OS execution.
    const users = await User.find({ email })
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
  // INTENTIONALLY INSECURE: authenticated normal users also gain access.
  router.get("/admin/demo", auth, (_req, res) =>
    res.json({ message: "Admin-only demonstration resource" }),
  );
  return router;
}
