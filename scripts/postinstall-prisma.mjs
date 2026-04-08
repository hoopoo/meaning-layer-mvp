import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://127.0.0.1:5432/__prisma_client_generate_only__";
}
execSync("npx prisma generate", { stdio: "inherit", env: process.env });
