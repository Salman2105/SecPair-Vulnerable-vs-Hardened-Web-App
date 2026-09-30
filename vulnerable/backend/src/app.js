import { createLab } from "../../../shared/backend/app.js";
import { demoRoutes } from "./routes/demo.js";
export const createApp = (options) =>
  createLab({ ...options, mode: "vulnerable", demoRoutes });
