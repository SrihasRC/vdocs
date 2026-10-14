import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Please run `neon env pull` or check your .env.local file.");
}

export const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
export * from "./schema";
