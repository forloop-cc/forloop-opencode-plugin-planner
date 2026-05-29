import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient, Template } from '../capabilities/api-client';
import { resolveSprintId } from '../capabilities/context-resolver';
import { validateToken } from '../capabilities/auth';

export function createTemplateListTool(client: ForLoopAPIClient) {
  return tool({
    description: 'List available story templates (Basic Task, Basic Note)',
    args: {},
    async execute(_args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const templates = await client.listTemplates();
        
        const lines: string[] = ['📋 Available Story Templates:', ''];
        
        for (const t of templates) {
          if (t.deletedAt) continue; // Skip deleted templates
          
          const fields = JSON.parse(t.fields);
          const fieldNames = fields.map((f: any) => f.label).join(', ');
          
          lines.push(`📝 **${t.name}** (\`${t.slug}\`)`);
          lines.push(`   ${t.description}`);
          lines.push(`   Fields: ${fieldNames}`);
          lines.push('');
        }
        
        if (lines.length <= 2) {
          return 'No templates found.';
        }
        
        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createStoryFromTemplateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Create a story using a template (Basic Task recommended for AI tasks)',
    args: {
      templateSlug: tool.schema.enum(['basic-task', 'basic-note'])
        .describe('Template slug: "basic-task" (recommended for AI tasks) or "basic-note"'),
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected from branch or env if not provided)'),
      taskTitle: tool.schema.string()
        .describe('Task or note title'),
      description: tool.schema.string()
        .optional()
        .describe('Description or content'),
      status: tool.schema.enum(['not-started', 'in-progress', 'completed'])
        .optional()
        .default('not-started')
        .describe('Task status'),
      priority: tool.schema.enum(['low', 'medium', 'high'])
        .optional()
        .default('medium')
        .describe('Priority level'),
      points: tool.schema.number()
        .min(0)
        .max(10)
        .optional()
        .describe('Story points (0-10, complexity estimate)'),
      assigneeId: tool.schema.number()
        .optional()
        .describe('User ID to assign task to'),
      assigneeAgentKey: tool.schema.string()
        .optional()
        .describe('AI agent key (e.g., "developer", "aivy")'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        // List templates to find by slug
        const templates = await client.listTemplates();
        const template = templates.find(t => t.slug === args.templateSlug && !t.deletedAt);
        
        if (!template) {
          return `❌ Template "${args.templateSlug}" not found. Available: basic-task, basic-note`;
        }

        // Resolve sprint ID
        const resolution = await resolveSprintId(args.sprintId, context.directory);
        if (!resolution.sprintId) {
          return [
            '❌ No sprint ID provided.',
            '',
            'Please specify a sprint ID using one of these methods:',
            '  1. Pass sprintId argument',
            '  2. Set FORLOOP_SPRINT_ID environment variable',
            '  3. Use a git branch named sprint-XXX',
          ].join('\n');
        }

        // Build metadata from template fields
        const metadata: any = {
          taskTitle: args.taskTitle,
          description: args.description,
          status: args.status,
          priority: args.priority,
          points: args.points,
        };

        // Add assignee (user or agent)
        if (args.assigneeId) {
          metadata.assignee = args.assigneeId;
        } else if (args.assigneeAgentKey) {
          metadata.assignee = `agent:${args.assigneeAgentKey}`;
        }

        // Map template status to DB status
        const statusMap: Record<
          'not-started' | 'in-progress' | 'completed' | 'blocked',
          'todo' | 'in_progress' | 'done' | 'blocked'
        > = {
          'not-started': 'todo',
          'in-progress': 'in_progress',
          'completed': 'done',
          'blocked': 'blocked',
        };

        // Determine story type from template
        const storyType = template.storyType || 'task';

        // Create story with all server-compatible fields
        const story = await client.createStory({
          title: args.taskTitle,
          description: args.description,
          sprintId: resolution.sprintId,
          type: storyType,
          templateId: template.id,
          metadata: JSON.stringify(metadata),
          priority: args.priority,
          points: args.points,
          status: statusMap[args.status] ?? 'todo',
          assigneeId: args.assigneeId,
          assigneeAgentKey: args.assigneeAgentKey,
          assigneeType: args.assigneeAgentKey ? 'agent' : args.assigneeId ? 'user' : undefined,
        });

        return [
          `✅ Story created with "${template.name}" template`,
          '',
          `**#${story.id}**: ${story.title}`,
          `**Sprint**: #${resolution.sprintId}`,
          `**Template**: ${template.name}`,
          `**Type**: ${story.type}`,
          args.assigneeAgentKey ? `**AI Agent**: ${args.assigneeAgentKey}` : null,
          args.assigneeId ? `**Assignee**: User #${args.assigneeId}` : null,
        ].filter(Boolean).join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
