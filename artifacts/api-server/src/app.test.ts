import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
let app: Express;
let root: string;
beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "wos-spa-"));
  await writeFile(path.join(root,"index.html"), "<!doctype html><html><body>Sign-in shell</body></html>");
  vi.stubEnv("FRONTEND_DIST_DIR",root);
  app = (await import("./app")).default;
});
afterAll(async () => {vi.unstubAllEnvs();await rm(root,{recursive:true,force:true});});
it("serves browser navigation and sign-in pages without a server handshake redirect", async () => {
  for(const url of ["/","/sign-in","/sign-up","/notes"]) {
    const res=await request(app).get(url).set("Accept","text/html").set("Sec-Fetch-Dest","document");
    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
    expect(res.text).toContain("Sign-in shell");
  }
});
it("keeps private API data behind owner authorization", async () => {
  for(const url of ["/api/notes","/api/icons","/api/storage/objects/uploads/missing"]) {
    const res=await request(app).get(url).set("Accept","application/json");
    expect(res.status).toBe(401);
    expect(res.headers["cache-control"]).toContain("no-store");
  }
});
