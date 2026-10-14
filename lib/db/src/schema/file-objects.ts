import { customType, pgTable, text } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
// Optional durable file backend for hosts without a persistent application disk.
export const fileObjectsTable = pgTable("file_objects", {
  objectPath: text("object_path").primaryKey(),
  contentType: text("content_type").notNull(),
  contents: bytea("contents").notNull(),
  sha256: text("sha256").notNull(),
});
