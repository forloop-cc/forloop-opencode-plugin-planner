import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { resolveSprintId } from '../capabilities/context-resolver';
import { validateToken } from '../capabilities/auth';

export function createAgentListTool(client: ForLoopAPIClient) {
  return tool({
    description: 'List all available AI agents in the catalog',
    args: {},
    async execute(_args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const agents = await client.listAiAgents();

        if (agents.length === 0) {
          return 'No AI agents found in the catalog.';
        }

        const lines = [
          '🤖 Available AI Agents:',
          '',
        ];

        for (const agent of agents) {
          const defaultBadge = agent.defaultEnabled ? ' (default enabled)' : '';
          lines.push(`**${agent.key}** - ${agent.name}${defaultBadge}`);
          lines.push(`  ${agent.description}`);
          lines.push(`  Category: ${agent.category || 'N/A'}`);
          lines.push('');
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createSprintAiAgentsUpdateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Enable or disable AI agents for a sprint',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (uses active sprint if not provided)'),
      enabledAgentKeys: tool.schema.array(tool.schema.string())
        .describe('Array of agent keys to enable for this sprint'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const resolution = await resolveSprintId(args.sprintId, context.directory);
      
      if (!resolution.sprintId) {
        return [
          '❌ No sprint ID provided.',
          '',
          'Please specify a sprint ID using one of these methods:',
          '  1. Pass --sprintId flag',
          '  2. Set FORLOOP_SPRINT_ID environment variable',
          '  3. Use a git branch named sprint-XXX',
        ].join('\n');
      }

      try {
        const agentKeys = args.enabledAgentKeys.filter(Boolean);
        
        if (agentKeys.length === 0) {
          return '❌ No agent keys provided. Please specify at least one agent key to enable.';
        }

        const sprintAiAgents = await client.updateSprintAiAgents(resolution.sprintId, agentKeys);

        const lines = [
          `✅ Updated AI agents for sprint #${resolution.sprintId}`,
          '',
          'Enabled agents:',
        ];

        for (const sprintAgent of sprintAiAgents) {
          lines.push(`  - ${sprintAgent.agent.name} (${sprintAgent.agentKey})`);
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
