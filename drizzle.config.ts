import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_NAME,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
  DATABASE_SCHEMA = "designers",
  DATABASE_SSL = "true",
} = process.env;

for (const [k, v] of Object.entries({
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
})) {
  if (!v) throw new Error(`${k} is required to run drizzle-kit`);
}

const ssl = DATABASE_SSL.toLowerCase() === "true" || DATABASE_SSL === "1";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  schemaFilter: [DATABASE_SCHEMA],
  dbCredentials: {
    host: DATABASE_HOST!,
    port: Number(DATABASE_PORT ?? 5432),
    user: DATABASE_USERNAME!,
    password: DATABASE_PASSWORD!,
    database: DATABASE_NAME!,
    ssl: ssl ? "require" : false,
  },
  strict: true,
  verbose: true,
});
