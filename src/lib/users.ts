import { loadDbForSheet } from "saasplusplus/dist/server/google-sheet-db/index";
import { TaskContext } from "./TaskContext";
import { ITaskContext } from "saasplusplus";

export type UserFromSheet = {
  username: string;
  password: string;
};

// https://docs.google.com/spreadsheets/d/1wiTFpSWAF02HpwA60dotEJMnw_mpnpHXaUAS98f3RU8
const SHEET_ID = process.env.USER_SHEET_ID;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedUsers: UserFromSheet[] | null = null;
let cachedAt = 0;

export async function getCachedUsers(
  tc: TaskContext,
): Promise<UserFromSheet[]> {
  if (cachedUsers && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedUsers;
  }
  cachedUsers = await getUsersFromSheet(tc);
  cachedAt = Date.now();
  return cachedUsers;
}

async function getUsersFromSheet(tc: TaskContext): Promise<UserFromSheet[]> {
  if (!SHEET_ID) {
    throw new Error("USER_SHEET_ID not provided");
  }
  const [x] = await loadDbForSheet({
    sheetId: SHEET_ID,
    taskContext: tc as unknown as ITaskContext,
  });
  const sheetUsers = x as UserFromSheet[];
  return sheetUsers;
}
