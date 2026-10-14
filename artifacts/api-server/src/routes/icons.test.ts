import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import router from "./icons";
const app = express(); app.use(router);
let temporary: string | undefined;
afterEach(async () => { vi.unstubAllEnvs(); if (temporary) await rm(temporary, { recursive: true, force: true }); temporary = undefined; });
describe("Portable icon catalog", () => {
  it("includes restored and packaged icons without listing metadata files", async () => {
    temporary = await mkdtemp(path.join(tmpdir(), "wos-restored-icons-"));
    await writeFile(path.join(temporary, "restored-only-fixture.png"), "fixture");
    await writeFile(path.join(temporary, "not-an-image.json"), "{}");
    vi.stubEnv("ICONS_DIR", temporary);
    const packaged = (await readdir(path.resolve(process.cwd(), "../wos-dashboard/public/icons"))).find(name => /\.png$/i.test(name));
    const response = await request(app).get("/icons");
    expect(response.status).toBe(200);
    expect(response.body).toContain("restored-only-fixture.png");
    expect(response.body).toContain(packaged);
    expect(response.body).not.toContain("not-an-image.json");
  });
  it("keeps packaged icons available before a restored-assets volume is populated", async () => {
    temporary = await mkdtemp(path.join(tmpdir(), "wos-empty-icon-volume-"));
    vi.stubEnv("ICONS_DIR", path.join(temporary, "icons"));
    const response = await request(app).get("/icons");
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
