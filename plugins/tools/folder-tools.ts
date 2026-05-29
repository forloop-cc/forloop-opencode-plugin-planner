import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { resolveSprintId } from '../capabilities/context-resolver';

export function createDocFolderTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Create a document folder for storing files (S3 storage)',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected from branch or env)'),
      title: tool.schema.string()
        .describe('Folder name'),
      description: tool.schema.string()
        .optional()
        .describe('Folder description'),
      permissions: tool.schema.enum(['public', 'team', 'private'])
        .optional()
        .default('team')
        .describe('Folder access permissions'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        // Resolve sprint ID
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

        // Create doc folder story
        const story = await client.createStory({
          title: args.title,
          description: args.description,
          sprintId: resolution.sprintId,
          type: 'doc_folder',
          metadata: JSON.stringify({
            permissions: args.permissions,
          }),
          status: 'todo',
        });

        const lines: string[] = [
          `✅ Document folder created!`,
          '',
          `**#${story.id}**: ${story.title}`,
          `**Sprint**: #${resolution.sprintId}`,
          `**Type**: doc_folder`,
          `**Permissions**: ${args.permissions}`,
          '',
          `📁 **Next Steps:**`,
          `  1. Upload files with: forloop.file.upload --sprintId ${resolution.sprintId}`,
          `  2. List files with: forloop.file.list --sprintId ${resolution.sprintId}`,
        ];

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
