# Vulnerabilities explained

All demonstrations target only this local lab's fake data. Sign in as `user@example.local` using your configured demo password. See [requests](postman.md) for exact steps.

### 1. Injection

- **Vulnerable behavior:** `POST /api/users/search` accepts an email object such as `{"$ne":null}`; both seeded accounts match instead of one.
- **Root cause:** The vulnerable route passes untrusted input into a MongoDB query value. MongoDB treats the object's operator as query syntax. This is NoSQL query-selector injection, not OS command execution or SQL injection.
- **Demonstration:** Compare `{"email":"user@example.local"}` with `{"email":{"$ne":null}}`. The vulnerable response expands from one to two fake user records. The hardened route returns 400 for the operator input.
- **Risk:** Manipulated filters can reveal records outside an intended lookup. This lab only returns email and role, caps results at ten, and does not demonstrate a login bypass or arbitrary database writes.
- **Hardened approach:** Accept exactly one email field containing a bounded, nonempty string, then construct `{email:{$eq:email}}` explicitly. Do not accept objects, arrays or arbitrary top-level fields.

Source: `vulnerable/backend/src/routes/demo.js` versus `hardened/backend/src/routes/demo.js`.

### 2. Stored XSS

- **Vulnerable behavior:** `POST /api/comments` stores raw comment strings. The vulnerable frontend loads them later and interprets them as HTML using iframe `srcDoc`.
- **Root cause:** Untrusted persisted data enters an HTML-executing output context. Merely storing a string is not itself XSS; the unsafe rendering creates the vulnerability. Both versions preserve the original string.
- **Demonstration:** Click Load harmless XSS example, then Save comment. An image error handler changes the sandboxed frame's text to Local XSS executed. Reload to prove that stored content is fetched and executes again. The hardened app displays the literal markup.
- **Risk:** In an unrestricted application origin, stored scripts could impersonate visitors or read accessible page data. That broader impact is not attempted here. The preview has an opaque origin, no same-origin permission, and a CSP blocking resource requests; no real tokens are placed in it.
- **Hardened approach:** Render content as a normal React text child. Basic server-side length/type checks enforce the data contract but are not an XSS defense. No rich HTML sanitizer is necessary because the hardened feature does not support HTML.

Source: each frontend's `src/Comment.jsx`. The deliberate unsafe output uses `srcDoc`, not `dangerouslySetInnerHTML`. The sandbox permits scripts only, so alerts are intentionally not required. Do not broaden its permissions or enter external payloads.

### 3. Broken Access Control

- **Vulnerable behavior:** `GET /api/admin/demo` returns the harmless admin resource to an authenticated normal user.
- **Root cause:** The server verifies identity but does not authorize the requested operation. A hidden frontend button would not fix this server-side issue.
- **Demonstration:** No token gives 401 in both versions. A normal user's token gives 200 in the vulnerable version and 403 in the hardened version. An admin token gives 200 in both.
- **Risk:** Missing role checks can expose privileged data or actions. This lab exposes only `{"message":"Admin-only demonstration resource"}`.
- **Hardened approach:** Apply `requireAuth` and `requireRole('admin')` to the server route. Read the current role from the database instead of trusting a client field or a stale role claim.

Source: each version's demo routes and `shared/backend/auth.js`. JWTs use HS256 with an explicit algorithm allowlist, issuer, version-specific audience and 15-minute expiry.
