import jwt from "jsonwebtoken";
export function requireAuth(User, secret, audience) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token)
      return res.status(401).json({ error: "Authentication required" });
    let claims;
    try {
      claims = jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer: "secpair",
        audience,
      });
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    const user =
      typeof claims.sub === "string" && /^[a-f0-9]{24}$/i.test(claims.sub)
        ? await User.findById(claims.sub)
        : null;
    if (!user) return res.status(401).json({ error: "Unknown user" });
    req.user = user;
    next();
  };
}
export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role
    ? next()
    : res.status(403).json({ error: "Admin role required" });
