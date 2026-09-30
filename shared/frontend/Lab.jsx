import React, { useState, useEffect } from "react";
export function Lab({ mode, Comment }) {
  const hard = mode === "hardened";
  const [token, setToken] = useState(""),
    [email, setEmail] = useState("user@example.local"),
    [password, setPassword] = useState("");
  const [query, setQuery] = useState('{"email":"user@example.local"}'),
    [content, setContent] = useState("Hello, local lab!"),
    [comments, setComments] = useState([]),
    [output, setOutput] = useState("Results will appear here."),
    [identity, setIdentity] = useState("Signed out");
  async function api(path, body) {
    const response = await fetch("/api" + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(response.status + ": " + data.error);
    return data;
  }
  async function run(action) {
    try {
      await action();
    } catch (e) {
      setOutput(e.message);
    }
  }
  async function refresh() {
    const data = await api("/comments");
    setComments(data.comments);
  }
  useEffect(() => {
    run(refresh);
  }, []);
  return (
    <main>
      <header>
        <span className={"badge " + mode}>
          {hard ? "HARDENED" : "VULNERABLE"}
        </span>
        <h1>SecPair</h1>
        <p>One small application. Three security lessons.</p>
        <strong>
          {hard
            ? "Security-hardened implementation."
            : "Educational vulnerable application \u2014 run locally only."}
        </strong>
        <p>
          <a href={hard ? "http://127.0.0.1:5173" : "http://127.0.0.1:5174"}>
            Open {hard ? "vulnerable" : "hardened"} comparison
          </a>
        </p>
      </header>
      <section>
        <h2>Demo identity</h2>
        <p>
          Use a seeded fake account and your local DEMO_PASSWORD. Tokens stay in
          memory and expire after 15 minutes.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const data = await api("/login", { email, password });
              setToken(data.token);
              setIdentity(data.role + " / " + email);
              setPassword("");
              setOutput("Signed in as " + data.role);
            });
          }}
        >
          <label>
            Account
            <select value={email} onChange={(e) => setEmail(e.target.value)}>
              <option>user@example.local</option>
              <option>admin@example.local</option>
            </select>
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button>Sign in</button>
          <button
            type="button"
            onClick={() => {
              setToken("");
              setIdentity("Signed out");
            }}
          >
            Sign out
          </button>
        </form>
        <p>{identity}</p>
      </section>
      <section>
        <h2>01 / Query injection</h2>
        <p>
          {hard
            ? "Only a literal email string is accepted and queried with $eq."
            : "An email object is passed into the database filter, allowing query operators to change matching."}
        </p>
        <label>
          Search JSON
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="actions">
          <button
            onClick={() =>
              run(async () =>
                setOutput(
                  JSON.stringify(
                    await api("/users/search", JSON.parse(query)),
                    null,
                    2,
                  ),
                ),
              )
            }
          >
            Run search
          </button>
          <button onClick={() => setQuery('{"email":{"$ne":null}}')}>
            Load operator example
          </button>
        </div>
      </section>
      <section>
        <h2>02 / Stored XSS</h2>
        <p>
          {hard
            ? "Stored content is rendered as normal React text. HTML is displayed literally."
            : "Stored HTML runs in a sandboxed preview with network access blocked. Educational vulnerable example \u2014 do not use in production."}
        </p>
        <label>
          Comment
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <div className="actions">
          <button
            onClick={() =>
              run(async () => {
                await api("/comments", { content });
                await refresh();
                setOutput(
                  "Comment saved. Reload the page to confirm persistence.",
                );
              })
            }
          >
            Save comment
          </button>
          <button
            onClick={() =>
              setContent(
                '<img src="data:," onerror="document.body.textContent=\'Local XSS executed\'">',
              )
            }
          >
            Load harmless XSS example
          </button>
          <button onClick={() => run(refresh)}>Refresh comments</button>
        </div>
        <div className="comments">
          {comments.map((comment) => (
            <Comment key={comment._id} content={comment.content} />
          ))}
        </div>
      </section>
      <section>
        <h2>03 / Broken access control</h2>
        <p>
          {hard
            ? "The server verifies the JWT identity, loads the current role, and requires admin. A normal user gets 403."
            : "The server verifies identity but omits the admin role check. A normal user can read this harmless resource."}
        </p>
        <button
          onClick={() =>
            run(async () =>
              setOutput(JSON.stringify(await api("/admin/demo"), null, 2)),
            )
          }
        >
          Request admin resource
        </button>
      </section>
      <section aria-live="polite">
        <h2>Result</h2>
        <pre>{output}</pre>
      </section>
      <footer>
        Local educational examples. Hardening these patterns does not make this
        a production-ready application.
      </footer>
    </main>
  );
}
