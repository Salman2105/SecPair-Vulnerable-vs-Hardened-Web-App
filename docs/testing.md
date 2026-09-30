# Verification record

Executed locally on 2026-09-30 on Windows with Node.js 22.14.0 and npm 10.9.2. These are focused functional/security regression checks, not a penetration test or certification.

| Check                        | Observed result                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| npm installation             | Succeeded; installation audit reported zero known vulnerabilities at that time                                                  |
| `npm test`                   | All 5 test groups passed using real disposable MongoDB 7.0.24                                                                   |
| Both backend entrypoints     | Started successfully as child processes, bound to loopback, served real curl requests                                           |
| Disposable lab command       | Started both APIs; both health endpoints returned 200; process stopped after verification                                       |
| MongoDB queries              | Literal email matched one fake user; operator input matched two only in vulnerable mode; hardened returned 400                  |
| Comment persistence          | API created and fetched the exact stored string; browser reloaded and fetched it again                                          |
| Authentication               | Correct fake credentials succeeded; incorrect passwords, tampered/expired tokens and tokens for the other app were rejected     |
| Password storage             | Database contained bcrypt hashes rather than the supplied password                                                              |
| Authorization                | Missing token: 401; normal user: vulnerable 200, hardened 403; admin: both 200                                                  |
| Current role enforcement     | Demoting an admin in the database caused an existing hardened token to receive 403                                              |
| Malformed input              | Invalid JSON, object login values, invalid comments and oversized bodies rejected                                               |
| Database disconnect          | Health and API returned 503 after connection close                                                                              |
| Unavailable MongoDB          | Backend exited with code 1 and a concise setup message, without a stack trace                                                   |
| `npm run build`              | Both React/Vite production builds passed                                                                                        |
| `npm run test:browser`       | Both frontends started and passed headless Chromium checks, with no uncaught page errors                                        |
| Stored XSS in browser        | Vulnerable sandbox executed the harmless handler after reload; hardened displayed literal markup with no injected image element |
| Browser access-control flows | Normal-user differences and successful admin access verified in both interfaces                                                 |
| Visual inspection            | Full-page screenshots of both interfaces inspected for readable controls, labels and results                                    |

## Scope of API tooling

Supertest exercised API assertions, and actual `curl.exe` requests exercised both server entrypoints: health, login, injection input, missing/normal-user admin access, and comment creation/retrieval. Playwright verified the browser behavior and successful admin flow. The Postman desktop application was not used; its request guide contains equivalent requests and expected responses. The Bash command block itself was not run verbatim on Windows.

## MongoDB status

No pre-existing persistent MongoDB service or Docker executable was available. Tests used a downloaded real MongoDB 7.0.24 binary with isolated temporary databases, not an in-memory JavaScript database mock. These databases are removed when the fixture shuts down. Persistent .env-based setup is documented; no permanent database service, credentials, or deployment was installed/configured.

## Reproduce

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run format:check
```

The first MongoDB/Chromium downloads require network access. Browser tests require the four documented ports to be free. Screenshots are written to ignored `test-results/`; they are local verification artifacts, not committed application assets. ESLint is not configured. Prettier provides formatting checks only, not static security analysis.

## Remaining limitations

No hosted deployment, complete security review, cross-browser matrix, load testing, rate limiting, account recovery or durable production session design. See the README for next development steps. Passing these checks demonstrates only the specified educational behaviors.
