import {
  DateFormat,
  nowFormated,
} from "saasplusplus/dist/agnostic-utils/timeUtils";
import { logger as globalLogger } from "./logger/logger";
import {
  ApiKeyKey,
  ApiKeyStore,
  ApiObjectStore,
} from "saasplusplus/dist/server/admin/systemTypes";
import { nanoid } from "nanoid";
import ILogger from "./logger/ILogger";

export interface TaskContext {
  jobId: Readonly<string>;
  isTest: Readonly<boolean>;
  logger: ILogger;
  readonly apiKeys: ApiKeyStore;
  readonly apiObject: ApiObjectStore;
}

interface TaskContextArgs {
  jobId: string;
  isTest?: boolean;
}

export function newTaskContext(jobId: string): TaskContext {
  return new TaskContextImpl({
    jobId: jobId,
  });
}

export function testTaskContext(testType: string): TaskContext {
  const time = nowFormated(DateFormat.YY_MM_DD_HH_MM_SS);
  return new TaskContextImpl({
    jobId: `Test ${testType} ${time}`,
    isTest: true,
  });
}

export class TaskContextImpl implements TaskContext {
  readonly uuid: string = nanoid();

  jobId: Readonly<string>;
  isTest: Readonly<boolean>;
  logger: ILogger;
  debug: Record<string, unknown>;

  readonly apiKeys: ApiKeyStore;
  readonly apiObject: ApiObjectStore;

  constructor(args: TaskContextArgs) {
    this.jobId = args.jobId;
    this.logger = globalLogger;
    this.apiKeys = loadEnvApiKey;
    this.apiObject = getEnvApiObject;

    this.debug = {};
    this.isTest = args.isTest ?? false;
  }
}

async function loadEnvApiKey(str: ApiKeyKey): Promise<string> {
  switch (str) {
    case ApiKeyKey.GoogleSearch_ApiKey:
      return process.env.GOOGLE_APP_KEY || '';
    case ApiKeyKey.GoogleSearch_SearchEngineId:
      return process.env.SEARCH_ENGINE_ID || '';
    default:
      return process.env[str] || '';
  }
}

const apiObjects: Record<string, string | object> = {};

function loadApiObject(key: string, input: string) {
  if (!input) {
    return null;
  }
  if (apiObjects[key]) {
    return apiObjects[key];
  }
  try {
    const result = JSON.parse(input);
    apiObjects[key] = result;
    return result;
  } catch {
    return null;
  }
}

async function getEnvApiObject(key: ApiKeyKey): Promise<string | object> {
  switch (key) {
    case ApiKeyKey.GoogleServiceAccount:
      return loadApiObject(
        ApiKeyKey.GoogleServiceAccount,
        process.env.GOOGLE_SERVICE_ACCOUNT ?? "",
      );
    default:
      throw new Error(`Unknown API key: ${key}`);
  }
}
