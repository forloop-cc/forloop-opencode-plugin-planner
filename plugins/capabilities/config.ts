import fs from 'fs';
import path from 'path';

export const PROD_API_URL = 'https://api.forloop.cc';
export const DEV_API_URL = 'https://api.dev.forloop.cc';

export const PROD_TOKENS_URL = 'https://forloop.cc/profile?tab=api-tokens';
export const DEV_TOKENS_URL = 'https://dev.forloop.cc/profile?tab=api-tokens';

export type Environment = 'development' | 'production' | 'custom';

export interface ForLoopConfig {
  apiUrl: string;
  environment: Environment;
  tokenStorage: 'global' | 'project';
  debug: boolean;
  allowDev: boolean;
}

type JsonObject = Record<string, unknown>;

const readJsonFileIfExists = (filePath: string): JsonObject | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as JsonObject;
  } catch {
    return null;
  }
};

const getHomeDir = (): string => {
  return process.env.HOME || process.env.USERPROFILE || '';
};

const getProjectConfig = (): JsonObject | null => {
  return readJsonFileIfExists(path.join(process.cwd(), 'opencode.json'));
};

const getGlobalConfig = (): JsonObject | null => {
  const home = getHomeDir();
  if (!home) return null;
  return readJsonFileIfExists(path.join(home, '.config', 'opencode', 'config.json'));
};

const getNested = (obj: JsonObject | null, keys: string[]): unknown => {
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as JsonObject)[key];
  }
  return cur;
};

const isTruthy = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return false;
};

const normalizeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

const isDevUrl = (apiUrl: string): boolean => {
  return apiUrl.includes('api.dev.forloop.cc') || apiUrl.includes('dev.forloop.cc');
};

const resolveAllowDev = (projectConfig: JsonObject | null, globalConfig: JsonObject | null): boolean => {
  return (
    isTruthy(process.env.FORLOOP_ALLOW_DEV) ||
    isTruthy(getNested(projectConfig, ['forloop', 'allowDev'])) ||
    isTruthy(getNested(globalConfig, ['forloop', 'allowDev']))
  );
};

const resolveApiUrl = (projectConfig: JsonObject | null, globalConfig: JsonObject | null, allowDev: boolean): string => {
  const envApiUrl = normalizeUrl(process.env.FORLOOP_API_URL || process.env.FORLOOP_API_BASE);
  if (envApiUrl) {
    if (isDevUrl(envApiUrl) && !allowDev) {
      console.warn('[ForLoop Config] Dev API URL ignored (set FORLOOP_ALLOW_DEV=true to enable)');
      return PROD_API_URL;
    }
    return envApiUrl;
  }

  const envName = normalizeUrl(process.env.FORLOOP_ENV);
  if (envName) {
    if (envName === 'production') return PROD_API_URL;
    if (envName === 'development') {
      if (!allowDev) {
        console.warn('[ForLoop Config] FORLOOP_ENV=development ignored (set FORLOOP_ALLOW_DEV=true to enable)');
        return PROD_API_URL;
      }
      return DEV_API_URL;
    }
  }

  const projectApiUrl = normalizeUrl(getNested(projectConfig, ['forloop', 'apiUrl']));
  if (projectApiUrl) {
    if (isDevUrl(projectApiUrl) && !allowDev) {
      console.warn('[ForLoop Config] Project dev API URL ignored (set forloop.allowDev=true or FORLOOP_ALLOW_DEV=true)');
      return PROD_API_URL;
    }
    return projectApiUrl;
  }

  const globalApiUrl = normalizeUrl(getNested(globalConfig, ['forloop', 'apiUrl']));
  if (globalApiUrl) {
    if (isDevUrl(globalApiUrl) && !allowDev) {
      console.warn('[ForLoop Config] Global dev API URL ignored (set forloop.allowDev=true or FORLOOP_ALLOW_DEV=true)');
      return PROD_API_URL;
    }
    return globalApiUrl;
  }

  return PROD_API_URL;
};

const detectEnvironment = (apiUrl: string): Environment => {
  if (apiUrl.includes('dev.forloop.cc')) {
    return 'development';
  }
  if (apiUrl.includes('api.forloop.cc')) {
    return 'production';
  }
  return 'custom';
};

export const getConfig = (): ForLoopConfig => {
  const projectConfig = getProjectConfig();
  const globalConfig = getGlobalConfig();
  const allowDev = resolveAllowDev(projectConfig, globalConfig);
  const apiUrl = resolveApiUrl(projectConfig, globalConfig, allowDev);
  
  return {
    apiUrl,
    environment: detectEnvironment(apiUrl),
    tokenStorage: 'global',
    debug: process.env.FORLOOP_DEBUG === 'true',
    allowDev,
  };
};

export const isDevelopment = (): boolean => {
  const config = getConfig();
  return config.environment === 'development' || process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  const config = getConfig();
  return config.environment === 'production';
};

export const printConfig = (): void => {
  const config = getConfig();
  console.log('[ForLoop Config]', {
    apiUrl: config.apiUrl,
    environment: config.environment,
    debug: config.debug,
    allowDev: config.allowDev,
  });
};

export const getTokensUrl = (): string => {
  const config = getConfig();
  if (config.environment === 'development') return DEV_TOKENS_URL;
  return PROD_TOKENS_URL;
};

/**
 * Detect if running in AWS Lambda environment
 * Uses standard Lambda environment variables
 */
export const isLambdaExecution = (): boolean => {
  const forced = (process.env.FORLOOP_EXECUTION_CONTEXT || '').toLowerCase();
  if (forced === 'lambda' || forced === 'aws_lambda' || forced === 'aws-lambda') return true;
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.LAMBDA_TASK_ROOT
  );
};

/**
 * Get the execution context (local or lambda)
 */
export type ExecutionContext = 'local' | 'lambda';

export const getExecutionContext = (): ExecutionContext => {
  return isLambdaExecution() ? 'lambda' : 'local';
};
