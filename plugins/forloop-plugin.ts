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
      'forloop.token.set': createTokenSetTool(client),
      'forloop.token.get': createTokenGetTool(),
      
      // Sprint Operations
      'forloop.sprint.list': createSprintListTool(client),
      'forloop.sprint.get': createSprintGetTool(client),
      'forloop.sprint.create': createSprintCreateTool(client),
      'forloop.sprint.update': createSprintUpdateTool(client),
      'forloop.sprint.delete': createSprintDeleteTool(client),
      
      // Story Operations
      'forloop.story.create': createStoryCreateTool(client),
      'forloop.story.get': createStoryGetTool(client),
      'forloop.story.update': createStoryUpdateTool(client),
      'forloop.story.delete': createStoryDeleteTool(client),
      
      // Template Operations
      'forloop.template.list': createTemplateListTool(client),
      'forloop.story.template': createStoryFromTemplateTool(client),
      
      // User & Quota Operations
      'forloop.user.profile': createUserProfileTool(client),
      'forloop.user.quotas': createUserQuotasTool(client),
      'forloop.organization.quotas': createOrganizationQuotasTool(client),
      
      // Organization Management
      'forloop.organization.list': createOrganizationListTool(client),
      'forloop.organization.get': createOrganizationGetTool(client),
      'forloop.organization.create': createOrganizationCreateTool(client),
      'forloop.organization.update': createOrganizationUpdateTool(client),
      'forloop.organization.delete': createOrganizationDeleteTool(client),
      
      // File Upload & Management
      'forloop.file.upload': createFileUploadTool(client),
      'forloop.file.list': createFileListTool(client),
      'forloop.file.delete': createFileDeleteTool(client),
      'forloop.file.download': createFileDownloadUrlTool(client),
      
      // Schedule Meetings
      'forloop.schedule.create': createScheduleTool(client),
      'forloop.schedule.update': createScheduleUpdateTool(client),
      
      // Document Folders
      'forloop.doc.folder': createDocFolderTool(client),

      // Aivy Doc Sync
      'forloop.sync.aivy.folder': createAivyDocFolderEnsureTool(client),
      'forloop.aivy.doc.get': createAivyDocFolderGetTool(client),
      'forloop.sync.s3ToLocal': createS3ToLocalSyncTool(client),
      'forloop.sync.localToS3': createLocalToS3SyncTool(client),
      
      // AI Agent Tools
      'forloop.agent.query': createAgentQueryTool(client),
      'forloop.agent.suggest': createAgentSuggestTool(client),
      'forloop.agent.breakdown': createStoryBreakdownTool(client),
      'forloop.agent.estimate': createStoryEstimateTool(client),
      'forloop.agent.history': createConversationHistoryTool(client),
      'forloop.agent.clear': createClearHistoryTool(client),
      'forloop.ai.agent.list': createAgentListTool(client),
      'forloop.sprint.ai_agents.update': createSprintAiAgentsUpdateTool(client),
      
      // AI Execution Tools
      ...aiTriggerTools,
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
