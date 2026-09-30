import { createApp } from "./app.js";
import { start } from "../../../shared/backend/start.js";
await start(createApp, "vulnerable", new URL("../.env", import.meta.url));
