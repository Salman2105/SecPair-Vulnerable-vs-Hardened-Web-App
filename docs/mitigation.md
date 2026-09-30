# Mitigation comparison

| Vulnerability         | Vulnerable Approach                                 | Hardened Approach                                                    |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Query injection       | Pass the supplied email value directly to the query | Whitelist fields, validate string type/length, use explicit equality |
| Stored XSS            | Interpret persisted text as HTML in the lab frame   | Use React text rendering without an HTML sink                        |
| Broken access control | Require identity only on the admin route            | Require identity plus a server-stored admin role                     |

**Input validation** defines accepted fields and types on the server. Frontend controls improve usability but callers can bypass them. JSON body limits and comment lengths also bound resource use; they do not make HTML safe.

**Safe database queries** keep data separate from operator syntax. The hardened search accepts a string and constructs its own `$eq` query. It never spreads a client object into a filter. The login route in both apps also rejects object inputs.

**Output handling** depends on the destination. Ordinary React children escape comment text. Sanitizing with regex is not a substitute for a safe output context. If rich HTML becomes necessary, introduce a maintained HTML sanitizer with a narrow policy and tests. JSON storage alone does not provide XSS prevention.

**Authentication** asks who the caller is. bcrypt verifies a seeded password hash; signed, expiring JWTs carry the identity. Secrets come from the environment in persistent mode and cryptographic randomness in disposable mode. Never use real credentials here.

**Authorization** asks whether that identity may perform the action. **Role-based access control** loads the user's current role and rejects non-admin users with 403. Missing or invalid authentication receives 401. The hardened API does not accept roles from request bodies as permission evidence.

These are educational examples, not a claim of complete security. The vulnerable sandbox and loopback binding are containment measures, not replacements for the hardened implementation.

## Reference documentation

- [Mongoose query casting](https://mongoosejs.com/docs/tutorials/query_casting.html) and [query options](https://mongoosejs.com/docs/api/query.html): query construction and filter behavior.
- [React common components](https://react.dev/reference/react-dom/components/common): risks of injecting untrusted HTML.
