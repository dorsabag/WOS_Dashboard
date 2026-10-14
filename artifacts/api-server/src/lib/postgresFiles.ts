import { createHash } from "node:crypto";
import { pool } from "@workspace/db";

export function usesPostgresFiles(): boolean {
  const backend = process.env.OBJECT_STORAGE_BACKEND || "filesystem";
  if (!["filesystem", "postgres"].includes(backend)) throw new Error("Unsupported OBJECT_STORAGE_BACKEND");
  return backend === "postgres";
}

export function fileResponse(bytes: Buffer, contentType: string): Response {
  const type = /^[\w.+-]+\/[\w.+-]+$/.test(contentType) ? contentType : "application/octet-stream";
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": type, "Content-Length": String(bytes.length),
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  } });
}

export async function insertFile(key: string, contents: Buffer, contentType: string): Promise<void> {
  try {
    await pool.query("INSERT INTO file_objects (object_path, content_type, contents, sha256) VALUES ($1,$2,$3,$4)",
      [key, contentType, contents, createHash("sha256").update(contents).digest("hex")]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw Object.assign(new Error("Object already exists"), { code: "EEXIST" });
    }
    throw error;
  }
}

export async function hasFile(key: string): Promise<boolean> {
  return (await pool.query("SELECT 1 FROM file_objects WHERE object_path=$1", [key])).rowCount === 1;
}

export async function readFileResponse(key: string): Promise<Response | null> {
  const { rows } = await pool.query<{ contents: Buffer; content_type: string; sha256: string }>(
    "SELECT contents, content_type, sha256 FROM file_objects WHERE object_path=$1", [key]);
  if (!rows.length) return null;
  const file = rows[0];
  if (createHash("sha256").update(file.contents).digest("hex") !== file.sha256) throw new Error("Stored object integrity check failed");
  return fileResponse(file.contents, file.content_type);
}

export async function removeFile(key: string): Promise<boolean> {
  return (await pool.query("DELETE FROM file_objects WHERE object_path=$1", [key])).rowCount === 1;
}

export async function storedIconNames(): Promise<string[]> {
  if (!usesPostgresFiles()) return [];
  const { rows } = await pool.query<{ object_path: string }>(
    "SELECT object_path FROM file_objects WHERE object_path LIKE '/assets/icons/%'");
  return rows.map(row => row.object_path.slice("/assets/icons/".length)).filter(isIconName);
}

export function isIconName(name: string): boolean {
  return !/[\\/\0%]/.test(name) && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(name);
}
