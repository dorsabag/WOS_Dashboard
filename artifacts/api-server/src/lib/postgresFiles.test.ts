import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";
import { insertFile, readFileResponse, storedIconNames, isIconName } from "./postgresFiles";

const keys: string[] = [];
beforeEach(() => vi.stubEnv("OBJECT_STORAGE_BACKEND", "postgres"));
afterEach(async () => {
  await pool.query("DELETE FROM file_objects WHERE object_path = ANY($1::text[])", [keys]);
  keys.length = 0;
  vi.unstubAllEnvs();
});
afterAll(() => pool.end());
function object() {
  const id = randomUUID(); const key = `/objects/uploads/${id}`; keys.push(key); return { id, key };
}
it("persists exact bytes across instances and refuses overwrite", async () => {
  const {id, key} = object(); const bytes = Buffer.from([0, 255, 10, 128]);
  await new ObjectStorageService().saveUpload(id, bytes, "image/png");
  await expect(new ObjectStorageService().saveUpload(id, Buffer.from("changed"), "image/png")).rejects.toMatchObject({code:"EEXIST"});
  const storage = new ObjectStorageService();
  const response = await storage.downloadObject(await storage.getObjectEntityFile(key));
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  await storage.deleteObjectEntity(key);
  await expect(storage.getObjectEntityFile(key)).rejects.toBeInstanceOf(ObjectNotFoundError);
});
it("rejects unsafe paths before database access", async () => {
  for(const key of ["/objects/../secret", "/objects/uploads/%2fsecret", "/objects//bad", "/assets/icons/a.png"]) {
    await expect(new ObjectStorageService().getObjectEntityFile(key)).rejects.toBeInstanceOf(ObjectNotFoundError);
  }
});
it("detects changed bytes rather than serving a corrupt file", async () => {
  const {id,key}=object();
  await new ObjectStorageService().saveUpload(id, Buffer.from("original"), "image/png");
  await pool.query("UPDATE file_objects SET contents=$1 WHERE object_path=$2",[Buffer.from("corrupt"),key]);
  await expect(readFileResponse(key)).rejects.toThrow("integrity check failed");
});
it("lists imported icons and retains safe content headers", async () => {
  const name=`test-${randomUUID()}.png`; const key=`/assets/icons/${name}`; keys.push(key);
  await insertFile(key, Buffer.from("icon"), "invalid\r\nheader");
  expect(await storedIconNames()).toContain(name);
  expect((await readFileResponse(key))?.headers.get("content-type")).toBe("application/octet-stream");
  expect(isIconName("../secret.png")).toBe(false);
  expect(isIconName("secret%2f.png")).toBe(false);
});
