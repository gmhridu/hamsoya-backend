import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql, schema });

// export const db = drizzle(process.env.DATABASE_URL!, { schema });
