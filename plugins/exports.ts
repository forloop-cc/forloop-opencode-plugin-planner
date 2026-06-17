// Re-exports for @forloop-cc/forloop-cli consumption.
// These were moved out of forloop-plugin.ts because Bun's TypeScript
// transpiler in opencode-ai@1.15.6 fails when a file has both
// `export default async` and additional `export { }` / `export type { }` lines.
export { ForLoopAPIClient } from './capabilities/api-client';
export type { APIError, CreateStoryRequest, CreateSprintRequest, ListSprintsParams, SprintOptions } from './capabilities/api-client';
export { getConfig, isLambdaExecution, PROD_API_URL, DEV_API_URL } from './capabilities/config';
export type { ForLoopConfig } from './capabilities/config';
export { getToken, setToken, clearToken } from './capabilities/token-storage';
export type { TokenProfile } from './capabilities/token-storage';
export { validateToken, detectTokenType } from './capabilities/auth';
export type { TokenValidationResult } from './capabilities/auth';
export { resolveSprintId, getCurrentBranch, resolveSprintFromBranch, getForloopRoot, getManifestPath } from './capabilities/context-resolver';
export type { ContextResolution } from './capabilities/context-resolver';
