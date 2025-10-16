// src/db/index.ts
import { drizzle } from "drizzle-orm/neon-http"; // or neon-serverless
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Factory function for custom database URLs
export const getDb = (databaseUrl?: string) => {
  const url = typeof databaseUrl === "string"
    ? databaseUrl
    : process.env.DATABASE_URL;

  if (!url) throw new Error("DATABASE_URL is not defined");

  // neon() returns a NeonQueryFunction
  const sql = neon(url);
  return drizzle(sql, { schema });
};

// Default db instance
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
