# Local API guide: Postman and curl

Run the lab first. These are local fake-data demonstrations only. Both versions expose identical paths; choose the base URL below. The response differences are intentional.

| Version    | Base URL              |
| ---------- | --------------------- |
| Vulnerable | http://127.0.0.1:4001 |
| Hardened   | http://127.0.0.1:4002 |

## Postman

Set a `baseUrl` variable. Use Body → raw → JSON and `Content-Type: application/json` for POST requests. Login returns `token`; copy it into Authorization → Bearer Token for protected requests. Use separate tokens from each API: audiences differ.

| Method and endpoint    | Body / authentication                                                  | Expected behavior                                      |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| GET /api/health        | None                                                                   | Both: 200 and database connected; 503 if disconnected  |
| POST /api/login        | `{"email":"user@example.local","password":"YOUR_LOCAL_DEMO_PASSWORD"}` | Both: 200 with token and user role; wrong password 401 |
| POST /api/users/search | Bearer; `{"email":"user@example.local"}`                               | Both: one fake user                                    |
| POST /api/users/search | Bearer; `{"email":{"$ne":null}}`                                       | Vulnerable: two fake users; hardened: 400              |
| POST /api/comments     | Bearer; `{"content":"Hello local lab"}`                                | Both: 201 and stored comment                           |
| GET /api/comments      | None                                                                   | Both: latest 20 stored comments, newest first          |
| GET /api/admin/demo    | No bearer                                                              | Both: 401                                              |
| GET /api/admin/demo    | Normal user bearer                                                     | Vulnerable: 200; hardened: 403                         |
| GET /api/admin/demo    | Admin bearer                                                           | Both: 200 with harmless message                        |

Stored-XSS JSON body:

```json
{
  "content": "<img src=\"data:,\" onerror=\"document.body.textContent='Local XSS executed'\">"
}
```

Open the matching frontend and refresh comments, then reload the page. Only the vulnerable sandbox should execute the handler; the hardened app displays text. An API response alone does not prove JavaScript execution.

## curl equivalents (Bash / Git Bash)

These commands use shell variables and JSON quoting for Bash, not Windows PowerShell. Replace the password placeholder with your fake local password. Avoid quotes in the password when using this illustrative inline JSON; the browser login avoids shell quoting issues.

```sh
BASE=http://127.0.0.1:4001
curl -sS "$BASE/api/health"
curl -sS "$BASE/api/login" -H 'Content-Type: application/json' --data '{"email":"user@example.local","password":"YOUR_LOCAL_DEMO_PASSWORD"}'
# Copy only the token value from login:
TOKEN=PASTE_TOKEN_HERE
curl -sS "$BASE/api/users/search" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data '{"email":"user@example.local"}'
curl -sS "$BASE/api/users/search" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data '{"email":{"$ne":null}}'
curl -sS "$BASE/api/comments" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data '{"content":"Hello local lab"}'
curl -sS "$BASE/api/comments"
curl -sS -i "$BASE/api/admin/demo"
curl -sS -i "$BASE/api/admin/demo" -H "Authorization: Bearer $TOKEN"
```

Repeat with `BASE=http://127.0.0.1:4002` and a fresh hardened token. Repeat login with `admin@example.local` to check the successful admin case. For the XSS body, save the JSON example as a local payload.json file and use `--data-binary @payload.json` with POST /api/comments; this avoids nested shell quotes.

Windows users can enter the same methods, URLs, headers and bodies in Postman, use Git Bash for the commands above, or use curl.exe with body files and `--data-binary @filename.json`. The test suite exercises equivalent HTTP requests automatically. See [testing status](testing.md) for what was actually executed; documentation is not a claim that Postman was used.
