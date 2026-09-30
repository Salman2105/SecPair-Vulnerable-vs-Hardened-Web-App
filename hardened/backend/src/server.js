import { createApp } from "./app.js";
import { start } from "../../../shared/backend/start.js";
await start(createApp, "hardened", new URL("../.env", import.meta.url));
