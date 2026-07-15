// This route serves skill.md as a Claude Code skill for AI agents.
// To update the skill, edit skill.md in this directory.

import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const skill = readFileSync(join(process.cwd(), "src/app/api/proxy/skill/skill.md"), "utf-8");

export async function GET() {
  return new NextResponse(skill, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
