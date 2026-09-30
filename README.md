# SecPair – Vulnerable vs Hardened Web Application

A small MERN security lab comparing intentionally vulnerable patterns with corresponding mitigations. This is an entry-level learning foundation, not a full product or penetration-testing report.

**This repository is an educational security lab. The vulnerable application intentionally contains insecure patterns and should only be run in a controlled local environment.**

## Overview and educational purpose

Explore the same three features in two browser tabs. Follow **vulnerable behavior → root cause → mitigation → hardened behavior**. All accounts and resources are fake. No external targets, command execution, or real secrets are involved.

## Architecture

Two React frontends call separate Express APIs through Vite's development proxy. Mongoose connects each API to its own MongoDB database. Shared code implements login, schemas and interface layout; security-sensitive routes and comment renderers stay in their respective version directories. Both APIs and development frontends bind to 127.0.0.1.

| Version    | Browser               | API                   | Persistent database |
| ---------- | --------------------- | --------------------- | ------------------- |
| Vulnerable | http://127.0.0.1:5173 | http://127.0.0.1:4001 | secpair_vulnerable  |
| Hardened   | http://127.0.0.1:5174 | http://127.0.0.1:4002 | secpair_hardened    |

### Vulnerable application

An email filter accepts MongoDB operators, a sandboxed frame interprets stored comments as HTML, and an admin endpoint checks authentication without checking role. Warnings identify intentional weaknesses. The frame omits same-origin access and uses a restrictive CSP; its demo changes only the frame's text.

### Hardened application

The search route validates a single string field and uses an explicit equality query. React displays comments as text. The admin endpoint requires a valid identity and the current server-stored admin role. These focused examples do not establish production-ready security.

## Security concepts and comparison

| Concept               | Vulnerable behavior                                          | Hardened behavior                                                   |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Query injection       | An email object containing `$ne` changes database matching   | Reject objects and unknown fields; use literal `$eq`                |
| Stored XSS            | Stored raw HTML executes inside a restricted demo frame      | Render the same stored content as React text                        |
| Broken access control | A normal authenticated user receives the admin demo resource | `requireAuth` plus `requireRole('admin')`; normal user receives 403 |

See [vulnerabilities](docs/vulnerabilities.md), [mitigations](docs/mitigation.md), and [API requests](docs/postman.md).

## Project structure

```text
vulnerable/
  backend/             # app, startup, deliberately vulnerable routes, env example
  frontend/            # React entry point and unsafe sandboxed renderer
hardened/
  backend/             # app, startup, validated queries and role checks
  frontend/            # React entry point and text renderer
shared/
  backend/             # schemas, JWT middleware, login, startup, seed helpers
  frontend/            # common demo controls and styles
scripts/               # seed, disposable local lab, browser checks
tests/                 # real MongoDB API integration tests and fixtures
docs/                  # explanations, local API guide, verification record
package.json           # npm workspaces and root commands
```

## Technologies

Node.js 22.14+, npm workspaces, Express 5, MongoDB, Mongoose 8, React 19, Vite 6, bcryptjs and jsonwebtoken. Tests use Node's test runner, Supertest, Playwright Chromium and mongodb-memory-server (which launches a real local mongod binary). API startup tests also require `curl` (`curl.exe` on Windows) on PATH.

## Local setup

From the repository root:

```sh
npm ci
```

The first install/test may download a MongoDB binary (approximately 600 MB on Windows) into a user cache. Internet access is needed for that initial download. No credentials are needed for the disposable database.

### Quick disposable lab

```sh
npm run lab:temporary
```

This starts both APIs and a temporary MongoDB process, seeds fake accounts, and prints a newly generated session-only demo password. Use `user@example.local` or `admin@example.local`. Data is discarded when the process exits. In two additional terminals run the frontend commands below. This mode does not need .env files or a MongoDB service. Do not also start the persistent backends on the same ports.

### Persistent local MongoDB

Install and start a local MongoDB service listening on 127.0.0.1:27017. Copy each backend's .env.example to .env. PowerShell:

```powershell
Copy-Item vulnerable/backend/.env.example vulnerable/backend/.env
Copy-Item hardened/backend/.env.example hardened/backend/.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate a separate `JWT_SECRET` for each file with the command above. Set `DEMO_PASSWORD` to a fake local password of 12–72 UTF-8 bytes; both seeded users in that database share it. Leave the example local database URIs and distinct ports. Never commit .env or reuse personal credentials. Seed explicitly:

```sh
node scripts/seed.js vulnerable
node scripts/seed.js hardened
```

Seeding updates only the two fake accounts and their password hashes/roles. It does not erase comments. Reset comments through your local database tool or restart the disposable lab.

## Running vulnerable backend/frontend

Run each command in a separate terminal from the root (omit the backend command in disposable mode):

```sh
npm run dev:vulnerable:backend
npm run dev:vulnerable:frontend
```

Open http://127.0.0.1:5173. Sign in as the normal user first. Load the operator example, save the harmless XSS example, and request the admin resource.

## Running hardened backend/frontend

```sh
npm run dev:hardened:backend
npm run dev:hardened:frontend
```

Open http://127.0.0.1:5174 and repeat. Sign in as admin to demonstrate the authorized success case. Tokens stay in browser memory, expire in 15 minutes, and are cleared on reload; existing comments still load publicly.

## API examples

See [Postman/curl guide](docs/postman.md) for login, bearer tokens, payloads, and expected status codes for both versions. `GET /api/health` reports connection state. The servers fail startup cleanly if MongoDB cannot be reached; after a lost connection API requests receive 503 once Mongoose detects the disconnect.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Stop other lab servers before browser testing because it uses ports 4001, 4002, 5173 and 5174. Tests use disposable databases and generated credentials. See [verification record](docs/testing.md) for checks actually performed and their limits. No ESLint configuration is included.

## Limitations

No registration, password reset, refresh/revocation service, rate limiting, audit trail, automated database backups or full security-header policy for a deployed frontend. Comments are intentionally readable without login. Login and the demo databases are designed only for controlled local use. Payload size limits are not sanitization. The sandbox reduces the XSS demo's reach; it is not a guarantee against every possible browser or navigation behavior. Use only the included harmless payloads.

No deployment is configured or claimed. The frontend build verifies compilation; serving that build with an API requires a separately configured reverse proxy. Vite's proxy is for local development. No complete penetration test or production security review has been performed.

## Future improvements

Add login rate limiting and audit events, comment ownership checks, CI running these tests, and an accessible side-by-side comparison view. Review session management and deployment headers before considering a deployment of the hardened app. Railway and Vercel are possible future hosting options; they have not been configured or verified. Keep the vulnerable app local.
