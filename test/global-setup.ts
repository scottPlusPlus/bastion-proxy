import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const TEST_DB = join(process.cwd(), "test.db");
const DATABASE_URL = `file:${TEST_DB}`;

export async function setup() {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL },
    stdio: "pipe",
  });
}

export async function teardown() {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
}
