import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import path from "node:path";
import { existsSync } from "node:fs";
import { isIconName, readFileResponse, usesPostgresFiles } from "./lib/postgresFiles";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  ...(process.env.APP_ORIGIN ? { authorizedParties: [process.env.APP_ORIGIN] } : {}),
}));

app.use("/api", router);

// One origin serves both API and SPA; private routes remain behind requireOwner.
// Restored source assets can live on a volume, outside the public code repository.
app.get("/icons/:name", async (req, res, next) => {
  if (!usesPostgresFiles() || !isIconName(req.params.name)) return next();
  const response = await readFileResponse(`/assets/icons/${req.params.name}`);
  if (!response) return next();
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(Buffer.from(await response.arrayBuffer()));
});
if (process.env.ICONS_DIR) app.use("/icons", express.static(process.env.ICONS_DIR));
const frontendDir = process.env.FRONTEND_DIST_DIR;
if (frontendDir && existsSync(path.join(frontendDir, "index.html"))) {
  app.use(express.static(frontendDir));
  app.get("/{*path}", (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.resolve(frontendDir, "index.html"));
  });
}

export default app;
