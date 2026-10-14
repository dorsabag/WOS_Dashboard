import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { randomUUID } from "node:crypto";
vi.mock("../middlewares/ownerAuth", () => ({ requireOwner: (_req: unknown, _res: unknown, next: () => void) => next() }));
import app from "../app";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "wos-files-"));
  vi.stubEnv("OBJECT_STORAGE_DIR", path.join(root, "objects"));
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });

describe("Independent private file storage", () => {
  it("uploads, streams, and deletes real bytes while preserving the existing SQL path format", async () => {
    const data = Buffer.from("fixture image bytes");
    const created = await request(app).post("/api/storage/uploads/request-url").send({ name: "fixture.png", size: data.length, contentType: "image/png" });
    expect(created.status).toBe(200);
    expect(created.body.objectPath).toMatch(/^\/objects\/uploads\//);
    expect((await request(app).put(new URL(created.body.uploadURL).pathname).set("Content-Type", "image/png").send(data)).status).toBe(201);
    const fetched = await request(app).get(`/api/storage${created.body.objectPath}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(data);
    expect(fetched.headers["cache-control"]).toBe("private, no-store");
    expect(fetched.headers["content-security-policy"]).toContain("sandbox");
    await new ObjectStorageService().deleteObjectEntity(created.body.objectPath);
    expect((await request(app).get(`/api/storage${created.body.objectPath}`)).status).toBe(404);
  });
  it("never overwrites an existing object", async () => {
    const storage = new ObjectStorageService(); const id = randomUUID();
    await storage.saveUpload(id, Buffer.from("original"), "image/png");
    await expect(storage.saveUpload(id, Buffer.from("replacement"), "image/png")).rejects.toMatchObject({ code: "EEXIST" });
    const response = await storage.downloadObject(await storage.getObjectEntityFile(`/objects/uploads/${id}`));
    expect(await response.text()).toBe("original");
  });
  it("rejects traversal and invalid upload identifiers", async () => {
    const storage = new ObjectStorageService();
    for (const value of ["/objects/../secret", "/objects//secret", "/objects/uploads/%2e%2e/secret", "/tmp/secret"]) {
      await expect(storage.getObjectEntityFile(value)).rejects.toBeInstanceOf(ObjectNotFoundError);
    }
    expect((await request(app).put("/api/storage/uploads/arbitrary-name").set("Content-Type", "image/png").send(Buffer.from("bad"))).status).toBe(400);
  });
  it("rejects symlink escapes without writing outside the storage volume", async () => {
    const storage = new ObjectStorageService();
    await mkdir(path.join(root, "objects")); await mkdir(path.join(root, "outside"));
    await symlink(path.join(root, "outside"), path.join(root, "objects/uploads"));
    await expect(storage.saveUpload(randomUUID(), Buffer.from("private"), "image/png")).rejects.toBeInstanceOf(ObjectNotFoundError);
  });
  it("keeps existing imported object paths readable", async () => {
    const storage = new ObjectStorageService(); const id = randomUUID();
    await storage.saveUpload(id, Buffer.from("original"), "image/png");
    const reopened = new ObjectStorageService();
    const file = await reopened.getObjectEntityFile(`/objects/uploads/${id}`);
    expect(await (await reopened.downloadObject(file)).text()).toBe("original");
  });
});
