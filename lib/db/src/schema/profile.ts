import { pgTable, serial, jsonb, timestamp } from "drizzle-orm/pg-core";

export const profileTable = pgTable("profile", {
  id: serial("id").primaryKey(),
  buildings: jsonb("buildings").notNull().default({}),
  research: jsonb("research").notNull().default({}),
  chiefGear: jsonb("chief_gear").notNull().default({}),
  chiefCharms: jsonb("chief_charms").notNull().default({}),
  heroGear: jsonb("hero_gear").notNull().default({}),
  heroes: jsonb("heroes").notNull().default({}),
  pets: jsonb("pets").notNull().default({}),
  experts: jsonb("experts").notNull().default({}),
  bonuses: jsonb("bonuses").notNull().default({}),
  exportData: jsonb("export_data").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Profile = typeof profileTable.$inferSelect;
