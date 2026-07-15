import { config } from "dotenv";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env"), quiet: true });
config({ path: join(root, ".env.local"), override: true, quiet: true });

const port = process.env.PORT ?? "4000";
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const command = process.argv[2] === "start" ? "start" : "dev";

const child = spawn(process.execPath, [nextBin, command, "-p", port], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
