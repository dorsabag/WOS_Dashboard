import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marchesTable = pgTable("marches", {
  id: serial("id").primaryKey(),
  marchNumber: integer("march_number").notNull(),
  label: text("label").notNull(),
  infantry: integer("infantry").notNull().default(0),
  lancer: integer("lancer").notNull().default(0),
  marksman: integer("marksman").notNull().default(0),
  capacity: integer("capacity").notNull().default(0),
  notes: text("notes"),
  icon0: text("icon0"),
  icon1: text("icon1"),
  icon2: text("icon2"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarchSchema = createInsertSchema(marchesTable).omit({ id: true, updatedAt: true });
export type InsertMarch = z.infer<typeof insertMarchSchema>;
export type March = typeof marchesTable.$inferSelect;
