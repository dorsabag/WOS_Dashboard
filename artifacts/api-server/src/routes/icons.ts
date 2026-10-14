import { Router } from "express";
import { readdirSync } from "fs";
import { resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname_es = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname_es, "../../wos-dashboard/public/icons");
const IMAGE_RE = /\.(png|jpg|jpeg|webp|gif|svg)$/i;

const router = Router();

router.get("/icons", (_req, res) => {
  try {
    const files = readdirSync(iconsDir)
      .filter(f => IMAGE_RE.test(f))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    res.json(files);
  } catch (err) {
    console.error("[icons] failed to read icons directory:", iconsDir, err);
    res.json([]);
  }
});

export default router;
