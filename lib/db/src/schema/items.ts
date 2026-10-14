import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  currentAmount: integer("current_amount").notNull().default(0),
  unit: text("unit"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, updatedAt: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
