import { tool } from '@opencode-ai/plugin';
import { getToken, setToken } from '../capabilities/token-storage';
import { validateToken } from '../capabilities/auth';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { getTokensUrl } from '../capabilities/config';

export function createTokenSetTool(client?: ForLoopAPIClient) {
  return tool({
    description: 'Set or update the ForLoop API token',
    args: {
      token: tool.schema.string()
        .describe('API token (starts with "floop_")'),
      profile: tool.schema.string()
        .optional()
        .describe('Profile name (e.g., "dev", "prod")'),
    },
    async execute(args, _context) {
      if (!args.token || !args.token.startsWith('floop_')) {
        return '❌ Invalid token format. ForLoop tokens should start with "floop_"';
      }

      try {
        await setToken(args.token, args.profile);
        client?.setToken(args.token);
        
        const message = args.profile
          ? `✅ Token saved to profile "${args.profile}"`
          : '✅ Default token saved successfully';
        
        return message;
      } catch (error: any) {
        return `❌ Error saving token: ${error.message}`;
      }
    },
  });
}

export function createTokenGetTool() {
  return tool({
    description: 'Check if ForLoop API token is configured',
    args: {
      profile: tool.schema.string()
        .optional()
        .describe('Profile name to check'),
    },
    async execute(args, _context) {
      const token = await getToken(args.profile);
      
      if (!token) {
        return [
          '❌ No ForLoop API token configured',
          '',
          'Token location: ~/.config/forloop/tokens.json',
          '',
          'To create a token:',
          `  1. Go to ${getTokensUrl()}`,
          '  2. Click "Create New Token"',
          '  3. Copy the token',
          '  4. Run: forloopTokenSet --token <your-token>',
        ].join('\n');
      }

      const masked = token.slice(0, 10) + '...' + token.slice(-4);
      return `✅ ForLoop token configured: ${masked}`;
    },
  });
}

export function createAgentQueryTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Query ForLoop AI agents for analysis, suggestions, or execution',
    args: {
      query: tool.schema.string()
        .describe('Natural language query or command'),
      agentKey: tool.schema.enum(['aivy', 'developer', 'project_manager', 'secretary'])
        .optional()
        .default('aivy'),
      sprintId: tool.schema.number()
        .optional()
        .describe('Sprint context'),
      enableMutations: tool.schema.boolean()
        .default(false)
        .describe('Allow agent to make changes'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const resolution = await resolveSprintId(args.sprintId, context.directory);
        
        const response = await client.chatWithAI({
          message: args.query,
          sprintId: resolution.sprintId,
          selectedAgentKey: args.agentKey,
          type: args.enableMutations ? 'feature' : 'analysis',
        });

        return [
          `Query submitted to ${args.agentKey} agent.`,
          '',
          response.message || 'Processing your request...',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

import { resolveSprintId } from '../capabilities/context-resolver';
