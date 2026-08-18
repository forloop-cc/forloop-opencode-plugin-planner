import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';

/**
 * Create tools for triggering AI agent execution via EventBridge
 */
export function createAITriggerTools(client: ForLoopAPIClient) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  tools['forloopAiDeveloperSpaceSprint'] = createDeveloperSprintTool(client);
  tools['forloopCreatorGenerate'] = createCreatorGenerateTool(client);

  return tools;
}

/**
 * forloopAiDeveloperSpaceSprint - Trigger developer agent for space work
 * Triggers the forLoopTaskSupervisor agent via EventBridge → Step Functions → ECS
 */
function createDeveloperSprintTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Trigger forLoopTaskSupervisor agent to execute space work. This sends stories to the developer agent for implementation via EventBridge → Step Functions → ECS Fargate.',
    args: {
      sprintId: tool.schema.number()
        .describe('Sprint ID to execute'),
      message: tool.schema.string()
        .optional()
        .describe('Optional instructions for the developer agent')
        .default('Start implementing the sprint stories assigned to the developer agent'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }

      try {
        console.log('[forloopAiDeveloperSpaceSprint] Triggering developer agent', {
          sprintId: args.sprintId,
        });

        const response = await client.chatWithAI({
          sprintId: args.sprintId,
          message: args.message || 'Start implementing the sprint stories assigned to the developer agent',
          selectedAgentKey: 'forLoopTaskSupervisor',
          type: 'developer.sprint',
          metadata: { channel: 'developer_sprint' },
        });

        const taskId = response.taskId || response.id || 'unknown';
        const trackingId = response.trackingId || 'unknown';

        return `🚀 Developer sprint triggered for execution

**Execution Details:**
- Task ID: \`${taskId}\`
- Tracking ID: \`${trackingId}\`
- Sprint: #${args.sprintId}
- Agent: forLoopTaskSupervisor

**What will happen:**
1. Sprint lock is acquired
2. ECS Fargate task starts with forLoopTaskSupervisor agent
3. Agent fetches sprint stories and processes them
4. Sub-agents are dispatched: forLoopDeveloper (code), forLoopTester (validation), forLoopDevops (deploy)
5. Sprint knowledge (knowledge-application.md) is updated
6. PR is created and auto-merged to develop
7. You'll be notified by email when complete

**Monitor Progress:**
- Check the ForLoop dashboard for story status updates
- Wait for email notification upon completion`
      } catch (error: any) {
        console.error('[forloopAiDeveloperSpaceSprint] Failed to trigger developer', error)
        return `❌ Failed to trigger forLoopTaskSupervisor: ${error.message}`
      }
    },
  });
}

/**
 * forloopCreatorGenerate - Trigger forLoopCreator agent on-demand during planning.
 * Dispatches the Creator via EventBridge → Step Functions → ECS (same path as
 * developer.sprint) using selectedAgentKey=forLoopCreator and type=creator.generate.
 * The planner MUST pre-create a Creator story (forloopStoryTemplate with
 * assigneeAgentKey="forLoopCreator") before dispatching.
 */
function createCreatorGenerateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Trigger the forLoopCreator agent on-demand during planning to generate files (documents, presentations, spreadsheets, music, images, video). Requires a story to be pre-created via forloopStoryTemplate(assigneeAgentKey="forLoopCreator") first. Generated files land under frontend/public/ and auto-deploy via CI/CD.',
    args: {
      sprintId: tool.schema.number()
        .describe('Sprint ID'),
      storyId: tool.schema.number()
        .describe('Pre-created Creator story ID (from forloopStoryTemplate with assigneeAgentKey="forLoopCreator")'),
      message: tool.schema.string()
        .optional()
        .describe('Generation instructions, including the story ID and desired output')
        .default('Generate the files described in the assigned story'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }

      try {
        console.log('[forloopCreatorGenerate] Triggering creator agent', {
          sprintId: args.sprintId,
          storyId: args.storyId,
        });

        const response = await client.chatWithAI({
          sprintId: args.sprintId,
          message: args.message,
          selectedAgentKey: 'forLoopCreator',
          type: 'creator.generate',
          metadata: { channel: 'creator_generate', storyId: args.storyId },
        });

        const taskId = response.taskId || response.id || 'unknown';
        const trackingId = response.trackingId || 'unknown';

        return `🎨 Creator dispatched for file generation

**Details:**
- Task ID: \`${taskId}\`
- Tracking ID: \`${trackingId}\`
- Sprint: #${args.sprintId}
- Story: #${args.storyId}
- Agent: forLoopCreator

**What happens next:**
1. Sprint lock is acquired (conflicts if a developer task is running)
2. ECS Fargate task starts the forLoopCreator agent
3. Files are generated under frontend/public/ and committed
4. Story is updated with a completion comment

**Monitor:** poll \`forloopDeveloperStatus(sprintId=${args.sprintId})\` for completion.`;
      } catch (error: any) {
        console.error('[forloopCreatorGenerate] Failed to trigger creator', error);
        return `❌ Failed to trigger forLoopCreator: ${error.message}`;
      }
    },
  });
}
