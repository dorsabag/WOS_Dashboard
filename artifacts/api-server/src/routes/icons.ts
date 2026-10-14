import { Router } from "express";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { storedIconNames } from "../lib/postgresFiles";

const IMAGE_RE = /\.(png|jpg|jpeg|webp|gif|svg)$/i;
const router = Router();
router.get("/icons", async (_req, res) => {
  // Restored icons override bytes at serving time, while the picker includes
  // both restored and packaged filenames. Supports root and package dev CWDs.
  const directories = [
    process.env.ICONS_DIR,
    resolve(process.cwd(), "artifacts/wos-dashboard/public/icons"),
    resolve(process.cwd(), "../wos-dashboard/public/icons"),
  ].filter((value): value is string => Boolean(value));
  const files = new Set<string>(await storedIconNames());
  for (const directory of new Set(directories)) {
    try { for (const name of readdirSync(directory)) if (IMAGE_RE.test(name)) files.add(name); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  res.json([...files].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
});
export default router;
