import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL || "");
export const db = drizzle({ client: sql, schema });

// export const db = drizzle(process.env.DATABASE_URL!, { schema });
