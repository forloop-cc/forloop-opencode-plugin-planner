import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { resolveSprintId } from '../capabilities/context-resolver';
import { validateToken } from '../capabilities/auth';

export function createStoryCreateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Create a story of type "doc_folder" only. For all other story types, use forloopStoryTemplate with templateSlug instead to ensure the story is linked to a template.',
    args: {
      title: tool.schema.string()
        .describe('Story title'),
      description: tool.schema.string()
        .optional()
        .describe('Story description'),
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID'),
      type: tool.schema.enum(['doc_folder'])
        .default('doc_folder'),
      priority: tool.schema.enum(['low', 'medium', 'high', 'critical'])
        .default('medium'),
      points: tool.schema.number()
        .min(0)
        .max(10)
        .optional()
        .describe('Story points (0-10)'),
      status: tool.schema.enum(['todo', 'in_progress', 'done', 'blocked'])
        .optional()
        .default('todo')
        .describe('Initial story status'),
      assigneeId: tool.schema.number()
        .optional()
        .describe('User ID to assign story to'),
      assigneeType: tool.schema.enum(['user', 'agent'])
        .optional()
        .default('user')
        .describe('Assignee type'),
      assigneeAgentKey: tool.schema.string()
        .optional()
        .describe('AI agent key (required when assigneeType is agent)'),
      x: tool.schema.number()
        .optional()
        .describe('Canvas X position (auto-generated if not provided)'),
      y: tool.schema.number()
        .optional()
        .describe('Canvas Y position (auto-generated if not provided)'),
      zIndex: tool.schema.number()
        .optional()
        .describe('Canvas layering order (auto-generated if not provided)'),
      templateId: tool.schema.number()
        .optional()
        .describe('Template ID to use for story creation'),
      templateSlug: tool.schema.string()
        .optional()
        .describe('Template slug to link story to a template. Required for task/note stories. Use forloopStoryTemplate instead for standard story creation.'),
      metadata: tool.schema.any()
        .optional()
        .describe('Additional metadata (JSON object)'),
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
          '  1. Pass sprintId argument',
          '  2. Set FORLOOP_SPRINT_ID environment variable',
          '  3. Use a git branch named sprint-XXX',
        ].join('\n');
      }

      try {
        const storyData: any = {
          title: args.title,
          description: args.description,
          sprintId: resolution.sprintId,
          type: args.type,
          priority: args.priority,
          points: args.points,
          status: args.status,
        };

        // Add assignee fields
        if (args.assigneeId !== undefined) {
          storyData.assigneeId = args.assigneeId;
        }
        if (args.assigneeType) {
          storyData.assigneeType = args.assigneeType;
          if (args.assigneeType === 'agent' && args.assigneeAgentKey) {
            storyData.assigneeAgentKey = args.assigneeAgentKey;
          }
        } else if (args.assigneeAgentKey) {
          storyData.assigneeType = 'agent';
          storyData.assigneeAgentKey = args.assigneeAgentKey;
        }

        // Add optional canvas position fields
        if (args.x !== undefined) storyData.x = args.x;
        if (args.y !== undefined) storyData.y = args.y;
        if (args.zIndex !== undefined) storyData.zIndex = args.zIndex;
        // Handle templateSlug lookup
        let templateId = args.templateId;
        if (args.templateSlug) {
          const templates = await client.listTemplates();
          const template = templates.find(t => t.slug === args.templateSlug && !t.deletedAt);
          if (!template) {
            return `❌ Template "${args.templateSlug}" not found. Use forloopTemplateList to see available templates.`;
          }
          templateId = template.id;
          
          // Auto-populate metadata from template fields if not provided
          if (!args.metadata) {
            storyData.metadata = JSON.stringify({
              taskTitle: args.title,
              description: args.description,
              status: "todo",
              priority: args.priority,
              points: args.points,
            });
          }
        }
        if (templateId !== undefined) storyData.templateId = templateId;
        if (args.metadata !== undefined) storyData.metadata = args.metadata;

        const story = await client.createStory(storyData);

        const lines = [
          '✅ Story created successfully!',
          '',
          `**#${story.id}**: ${story.title}`,
          `**Sprint**: #${resolution.sprintId}`,
          `**Type**: ${story.type}`,
          `**Priority**: ${story.priority}`,
        ];

        if (story.points) {
          lines.push(`**Points**: ${story.points}`);
        }
        if (story.status) {
          lines.push(`**Status**: ${story.status}`);
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createStoryUpdateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Update an existing story',
    args: {
      storyId: tool.schema.number()
        .describe('Story ID to update'),
      title: tool.schema.string()
        .optional()
        .describe('New title'),
      description: tool.schema.string()
        .optional()
        .describe('New description'),
      status: tool.schema.enum(['todo', 'in_progress', 'done', 'blocked'])
        .optional()
        .describe('New status'),
      priority: tool.schema.enum(['low', 'medium', 'high', 'critical'])
        .optional()
        .describe('New priority'),
      points: tool.schema.number()
        .min(0)
        .max(10)
        .optional()
        .describe('New story points'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const updateData: any = {};
        if (args.title !== undefined) updateData.title = args.title;
        if (args.description !== undefined) updateData.description = args.description;
        if (args.status !== undefined) updateData.status = args.status;
        if (args.priority !== undefined) updateData.priority = args.priority;
        if (args.points !== undefined) updateData.points = args.points;

        const story = await client.updateStory(args.storyId, updateData);

        return `✅ Story #${story.id} updated successfully!`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createStoryGetTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get details of a specific story including sprint info, assignee, and comments. Use to understand what developer agents have implemented in a story (commit SHAs, files changed, test results).',
    args: {
      storyId: tool.schema.number()
        .describe('Story ID to retrieve'),
      includeComments: tool.schema.boolean()
        .default(true)
        .describe('Include story comments (shows what developer agents have done)'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const story = await client.getStory(args.storyId, {
          includeComments: args.includeComments !== false,
        });

        const lines = [
          `📝 Story #${story.id}: ${story.title}`,
          '',
          `**Sprint**: #${story.sprint?.id || 'N/A'} ${story.sprint?.title || ''}`,
          `**Status**: ${story.status}`,
          `**Priority**: ${story.priority}`,
          `**Type**: ${story.type}`,
        ];

        if (story.points) {
          lines.push(`**Points**: ${story.points}`);
        }

        if (story.assignee) {
          lines.push(`**Assignee**: ${story.assignee.name || story.assignee.email || 'Unknown'}`);
        }

        if (story.assigneeAgentKey) {
          lines.push(`**Agent**: ${story.assigneeAgentKey}`);
        }

        if (story.description) {
          lines.push('');
          lines.push('**Description**:');
          lines.push(story.description);
        }

        if (args.includeComments !== false && story.comments?.length) {
          lines.push('');
          lines.push('---');
          lines.push(`**Comments** (${story.comments.length}):`);
          for (const comment of story.comments) {
            const author = comment.authorAgentKey || comment.user?.name || 'Unknown';
            const time = comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '';
            lines.push('');
            lines.push(`💬 **${author}** ${time ? `(${time})` : ''}`);
            if (comment.status) {
              lines.push(`   Status: ${comment.status}`);
            }
            const commentText = comment.content || comment.body || '';
            if (commentText) {
              lines.push(`   ${commentText}`);
            }
            if (comment.artifacts?.length) {
              lines.push(`   📎 Artifacts: ${comment.artifacts.join(', ')}`);
            }
            if (comment.assumptions?.length) {
              lines.push(`   💡 Assumptions: ${comment.assumptions.join(', ')}`);
            }
          }
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createStoryDeleteTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Delete a story',
    args: {
      storyId: tool.schema.number()
        .describe('Story ID to delete'),
      confirm: tool.schema.boolean()
        .optional()
        .default(false)
        .describe('Set to true to confirm deletion'),
    },
    async execute(args, _context) {
      if (!args.confirm) {
        return '⚠️  Please confirm deletion by setting confirm: true';
      }
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        await client.deleteStory(args.storyId);

        return `✅ Story #${args.storyId} deleted successfully!`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
