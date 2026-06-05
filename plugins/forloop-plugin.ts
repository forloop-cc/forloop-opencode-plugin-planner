import { getToken } from './capabilities/token-storage';
import { ForLoopAPIClient } from './capabilities/api-client';
import { getConfig, isLambdaExecution } from './capabilities/config';
import { 
  createSprintGetTool, 
  createSprintListTool,
  createSprintCreateTool,
  createSprintUpdateTool,
  createSprintDeleteTool,
} from './tools/sprint-tools';
import { 
  createStoryCreateTool, 
  createStoryUpdateTool, 
  createStoryDeleteTool,
  createStoryGetTool,
} from './tools/story-tools';
import { 
  createTemplateListTool,
  createStoryFromTemplateTool,
} from './tools/template-tools';
import { 
  createUserProfileTool,
  createUserQuotasTool,
  createOrganizationQuotasTool,
} from './tools/user-tools';
import {
  createOrganizationListTool,
  createOrganizationGetTool,
  createOrganizationCreateTool,
  createOrganizationUpdateTool,
  createOrganizationDeleteTool,
} from './tools/organization-tools';
import {
  createFileUploadTool,
  createFileListTool,
  createFileDeleteTool,
  createFileDownloadUrlTool,
} from './tools/file-tools';
import {
  createScheduleTool,
  createScheduleUpdateTool,
} from './tools/schedule-tools';
import {
  createDocFolderTool,
} from './tools/folder-tools';
import {
  createAivyDocFolderEnsureTool,
  createAivyDocFolderGetTool,
  createS3ToLocalSyncTool,
  createLocalToS3SyncTool,
} from './tools/sync-tools';
import { createAgentQueryTool, createTokenSetTool, createTokenGetTool } from './tools/agent-tools';
import { 
  createAgentSuggestTool,
  createStoryBreakdownTool,
  createStoryEstimateTool,
  createConversationHistoryTool,
  createClearHistoryTool
} from './tools/agent-suggestion-tools';
import {
  createAgentListTool,
  createSprintAiAgentsUpdateTool,
} from './tools/agent-sprint-tools';
import { createAITriggerTools } from './tools/ai-trigger-tools';
import { createDeveloperStatusTool } from './tools/developer-status-tool';
import { injectEnvironment } from './hooks/shell-env';
import { createChatMessageHook, createEventHook } from './hooks/message-recorder';

export default async (ctx: any) => {
  const config = getConfig();
  const token = (await getToken()) || '';

  console.log(
    `[ForLoop] Plugin initialized - ${config.environment} (${config.apiUrl}) execution=${isLambdaExecution() ? 'lambda' : 'local'} forced=${process.env.FORLOOP_EXECUTION_CONTEXT || 'not set'}`
  );
  if (!token) {
    console.log('[ForLoop] No token configured - tools will ask you to set one');
  }

  const client = new ForLoopAPIClient({
    token,
    baseUrl: config.apiUrl,
  });

  const aiTriggerTools = createAITriggerTools(client);

  return {
    tool: {
      // Token Management
      'forloopTokenSet': createTokenSetTool(client),
      'forloopTokenGet': createTokenGetTool(),
      
      // Sprint Operations
      'forloopSprintList': createSprintListTool(client),
      'forloopSprintGet': createSprintGetTool(client),
      'forloopSprintCreate': createSprintCreateTool(client),
      'forloopSprintUpdate': createSprintUpdateTool(client),
      'forloopSprintDelete': createSprintDeleteTool(client),
      
      // Story Operations
      'forloopStoryCreate': createStoryCreateTool(client),
      'forloopStoryGet': createStoryGetTool(client),
      'forloopStoryUpdate': createStoryUpdateTool(client),
      'forloopStoryDelete': createStoryDeleteTool(client),
      
      // Template Operations
      'forloopTemplateList': createTemplateListTool(client),
      'forloopStoryTemplate': createStoryFromTemplateTool(client),
      
      // User & Quota Operations
      'forloopUserProfile': createUserProfileTool(client),
      'forloopUserQuotas': createUserQuotasTool(client),
      'forloopOrganizationQuotas': createOrganizationQuotasTool(client),
      
      // Organization Management
      'forloopOrganizationList': createOrganizationListTool(client),
      'forloopOrganizationGet': createOrganizationGetTool(client),
      'forloopOrganizationCreate': createOrganizationCreateTool(client),
      'forloopOrganizationUpdate': createOrganizationUpdateTool(client),
      'forloopOrganizationDelete': createOrganizationDeleteTool(client),
      
      // File Upload & Management
      'forloopFileUpload': createFileUploadTool(client),
      'forloopFileList': createFileListTool(client),
      'forloopFileDelete': createFileDeleteTool(client),
      'forloopFileDownload': createFileDownloadUrlTool(client),
      
      // Schedule Meetings
      'forloopScheduleCreate': createScheduleTool(client),
      'forloopScheduleUpdate': createScheduleUpdateTool(client),
      
      // Document Folders
      'forloopDocFolder': createDocFolderTool(client),

      // Aivy Doc Sync
      'forloopSyncAivyFolder': createAivyDocFolderEnsureTool(client),
      'forloopAivyDocGet': createAivyDocFolderGetTool(client),
      'forloopSyncS3ToLocal': createS3ToLocalSyncTool(client),
      'forloopSyncLocalToS3': createLocalToS3SyncTool(client),
      
      // AI Agent Tools
      'forloopAgentQuery': createAgentQueryTool(client),
      'forloopAgentSuggest': createAgentSuggestTool(client),
      'forloopAgentBreakdown': createStoryBreakdownTool(client),
      'forloopAgentEstimate': createStoryEstimateTool(client),
      'forloopAgentHistory': createConversationHistoryTool(client),
      'forloopAgentClear': createClearHistoryTool(client),
      'forloopAiAgentList': createAgentListTool(client),
      'forloopSprintAiAgentsUpdate': createSprintAiAgentsUpdateTool(client),
      
      // AI Execution Tools
      ...aiTriggerTools,
      'forloopDeveloperStatus': createDeveloperStatusTool(client),
    },
    event: createEventHook(client),
    'chat.message': createChatMessageHook(client),
    'shell.env': injectEnvironment,
    'tool.execute.before': (input: any, output: any) => {
      if (!(globalThis as any).__toolHookKeysLogged) {
        (globalThis as any).__toolHookKeysLogged = 1;
        console.log('[ForLoop] tool.execute.before input keys:', Object.keys(input || {}).join(', '));
      }
      const agent = input.agent || input.agentName || input.sourceAgent || input.agentId || '';
      const args = typeof output?.args === 'object' ? JSON.stringify(output.args) : String(output?.args || '');
      console.log(`[forloop][${agent}] ▶ ${input.tool}`, args.substring(0, 400));
    },
    'tool.execute.after': (input: any, output: any) => {
      const agent = input.agent || input.agentName || input.sourceAgent || input.agentId || '';
      const summary = typeof output === 'string'
        ? output.substring(0, 200)
        : (output?.text || output?.message || JSON.stringify(output).substring(0, 200));
      console.log(`[forloop][${agent}] ✓ ${input.tool} completed:`, summary);
    },
  };
};

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
