import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";

export class ObjectNotFoundError extends Error {
  constructor() { super("Object not found"); this.name = "ObjectNotFoundError"; }
}

/** Private files on an operator-owned persistent volume; SQL paths stay unchanged. */
export class ObjectStorageService {
  private async resolve(objectPath: string, create = false): Promise<string> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const segments = objectPath.slice("/objects/".length).split("/");
    if (!segments.length || segments.some(part => !part || part === "." || part === ".." || /[\\/\0%]/.test(part))) throw new ObjectNotFoundError();
    const configured = process.env.OBJECT_STORAGE_DIR;
    if (!configured || !path.isAbsolute(configured)) throw new Error("OBJECT_STORAGE_DIR must be an absolute persistent directory");
    if (create) await mkdir(configured, { recursive: true, mode: 0o700 });
    try {
      const root = await realpath(configured);
      const candidate = path.join(root, ...segments);
      if (create) await mkdir(path.join(root, "uploads"), { recursive: true, mode: 0o700 });
      const parent = await realpath(path.dirname(candidate));
      if (parent !== root && !parent.startsWith(root + path.sep)) throw new ObjectNotFoundError();
      const info = await lstat(candidate).catch((error: NodeJS.ErrnoException) => {
        if (create && error.code === "ENOENT") return null;
        throw error;
      });
      if (info && !info.isFile()) throw new ObjectNotFoundError();
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ObjectNotFoundError();
      throw error;
    }
  }

  async getObjectEntityUploadURL(): Promise<string> { return `/api/storage/uploads/${randomUUID()}`; }

  normalizeObjectEntityPath(rawPath: string): string {
    const match = /^\/api\/storage\/uploads\/([a-f0-9-]+)$/.exec(rawPath);
    return match ? `/objects/uploads/${match[1]}` : rawPath;
  }

  async saveUpload(id: string, body: Buffer, contentType: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new ObjectNotFoundError();
    const file = await this.resolve(`/objects/uploads/${id}`, true);
    // Exclusive writes prevent replacing existing files or imported data.
    await writeFile(file, body, { flag: "wx", mode: 0o600 });
    try {
      await writeFile(file + ".metadata.json", JSON.stringify({ contentType }), { flag: "wx", mode: 0o600 });
    } catch (error) { await unlink(file); throw error; }
  }

  async getObjectEntityFile(objectPath: string): Promise<string> { return this.resolve(objectPath); }

  async downloadObject(file: string): Promise<Response> {
    const info = await stat(file);
    const metadata = await readFile(file + ".metadata.json", "utf8").then(JSON.parse).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return {};
      throw error;
    });
    const contentType = typeof metadata.contentType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(metadata.contentType) ? metadata.contentType : "application/octet-stream";
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: {
      "Content-Type": contentType, "Content-Length": String(info.size), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'",
    } });
  }

  async deleteObjectEntity(objectPath: string): Promise<void> {
    const file = await this.getObjectEntityFile(objectPath);
    await unlink(file);
    await unlink(file + ".metadata.json").catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
}
