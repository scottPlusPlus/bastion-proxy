import { NextRequest } from "next/server";
import { vppStringNonEmpty } from "saasplusplus";
import { logger } from "../logger/logger";
import { getCachedUsers } from "../users";
import { newTaskContext } from "../TaskContext";

export async function validUserFromReq(
  req: NextRequest,
): Promise<string | null> {
  const authInput = getApiKeyFromReq(req);
  return validUserFromHeader(authInput);
}

function getApiKeyFromReq(req: NextRequest): string | null {
  let authHeader = req.headers.get("authorization");
  if (!vppStringNonEmpty().check(authHeader)) {
    authHeader = req.headers.get("x-api-key");
  }
  if (vppStringNonEmpty().check(authHeader)) {
    authHeader = authHeader.replace("Bearer ", "");
    authHeader = authHeader.replace("BEARER ", "");
  }
  return authHeader;
}

async function validUserFromHeader(
  input?: string | null,
): Promise<string | null> {
  if (!vppStringNonEmpty().check(input)) {
    logger.debug(`invalid User: "${input}"`);
    return null;
  }

  const [login, password] = input.split(":");
  if (!login || !password) {
    logger.debug(`invalid User format: "${input}"`);
    return null;
  }

  const res = asValidUserOrNull(login, password);
  if (res) {
    return res;
  }

  logger.debug(`invalid User: "${input}"`);
  return null;
}

export async function asValidUserOrNull(
  user: string,
  password: string,
): Promise<string | null> {
  const tc = newTaskContext("auth");
  const users = await getCachedUsers(tc);
  const match = users.find(
    (u) => u.username === user && u.password === password,
  );
  return match ? user : null;
}
