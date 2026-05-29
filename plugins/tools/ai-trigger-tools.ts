import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';

/**
 * Create tools for triggering AI agent execution via EventBridge
 */
export function createAITriggerTools(client: ForLoopAPIClient) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  tools['forloop.ai.developer.sprint'] = createDeveloperSprintTool(client);

  return tools;
}

/**
 * forloop.ai.developer.sprint - Trigger developer agent for sprint work
 * Triggers the forLoopTaskSupervisor agent via EventBridge → Step Functions → ECS
 */
function createDeveloperSprintTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Trigger forLoopTaskSupervisor agent to execute sprint work. This sends stories to the developer agent for implementation via EventBridge → Step Functions → ECS Fargate.',
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
        console.log('[forloop.ai.developer.sprint] Triggering developer agent', {
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
        console.error('[forloop.ai.developer.sprint] Failed to trigger developer', error)
        return `❌ Failed to trigger forLoopTaskSupervisor: ${error.message}`
      }
    },
  });
}
