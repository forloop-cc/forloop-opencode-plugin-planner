import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { resolveSprintId } from '../capabilities/context-resolver';
import { validateToken } from '../capabilities/auth';
import { getToken } from '../capabilities/token-storage';

export function createSprintGetTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get space details including stories, files, and AI agents',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Sprint ID (defaults to FORLOOP_SPRINT_ID env or current branch)'),
      includeStories: tool.schema.boolean()
        .default(true)
        .describe('Include stories in response'),
      includeFiles: tool.schema.boolean()
        .default(true)
        .describe('Include files in response'),
      includeSubSprints: tool.schema.boolean()
        .default(true)
        .describe('Include sub-sprints array in response'),
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
          '  3. Use a git branch named sprint-XXX (e.g., sprint-123)',
        ].join('\n');
      }

      try {
        const sprint = await client.getSprint(resolution.sprintId, {
          includeStories: args.includeStories,
          includeFiles: args.includeFiles,
          includeSubSprints: args.includeSubSprints,
        });

        const lines = [
          `📋 Space #${sprint.id}: ${sprint.title}`,
          '',
          `**Status**: ${sprint.status}`,
          `**Period**: ${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`,
          `**Stories**: ${sprint.stories?.length || 0}`,
          '',
        ];

        if (sprint.summary) {
          lines.push(`**Summary**: ${sprint.summary}`);
          lines.push('');
        }

        if (sprint.stories?.length) {
          lines.push('**Stories**:', '');
          for (const story of sprint.stories) {
            const icon = getStoryStatusIcon(story.status);
            lines.push(`- ${icon} #${story.id} ${story.title} (${story.status})`);
          }
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createSprintListTool(client: ForLoopAPIClient) {
  return tool({
    description: 'List all accessible spaces',
    args: {
      organizationId: tool.schema.number()
        .optional()
        .describe('Filter by organization ID'),
      includeSystemOrg: tool.schema.boolean()
        .default(true)
        .describe('Include sprints from system organization'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const params: Record<string, string> = {};
      if (args.organizationId) params.organizationId = String(args.organizationId);
      
      try {
        const sprints = await client.listSprints({
          organizationId: args.organizationId,
          includeSystemOrg: args.includeSystemOrg ?? true,
        });

        if (!sprints.length) {
          return 'No spaces found.';
        }

        const lines = ['📋 Spaces:', ''];
        for (const sprint of sprints) {
          const statusIcon = getStatusIcon(sprint.status);
          const orgInfo = sprint.organizationName ? ` (${sprint.organizationName})` : '';
          lines.push(
            `- ${statusIcon} #${sprint.id} ${sprint.title}${orgInfo} - ${sprint.status}`
          );
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStoryStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    todo: '📝',
    in_progress: '🚧',
    done: '✅',
    blocked: '🚫',
  };
  return icons[status] || '📌';
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    planned: '📅',
    'in-progress': '🚧',
    completed: '✅',
  };
  return icons[status] || '📌';
}

export function createSprintCreateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Create a new space with specified dates and settings',
    args: {
      title: tool.schema.string()
        .describe('Sprint title'),
      description: tool.schema.string()
        .optional()
        .describe('Sprint description'),
      startDate: tool.schema.string()
        .describe('Sprint start date (ISO format: YYYY-MM-DD)'),
      endDate: tool.schema.string()
        .describe('Sprint end date (ISO format: YYYY-MM-DD)'),
      isPrivate: tool.schema.boolean()
        .default(false)
        .describe('Whether sprint is private'),
      organizationId: tool.schema.number()
        .optional()
        .describe('Organization ID (defaults to user default)'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const sprint = await client.createSprint({
          title: args.title,
          description: args.description,
          startDate: args.startDate,
          endDate: args.endDate,
          isPrivate: args.isPrivate,
          organizationId: args.organizationId,
        });

        const lines = [
          '✅ Space created successfully!',
          '',
          `**#${sprint.id}**: ${sprint.title}`,
          `**Period**: ${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`,
          `**Status**: ${sprint.status}`,
        ];

        if (sprint.isPrivate) {
          lines.push('**Visibility**: Private');
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createSprintUpdateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Update space details',
    args: {
      sprintId: tool.schema.number()
        .describe('Sprint ID to update'),
      title: tool.schema.string()
        .optional()
        .describe('New title'),
      description: tool.schema.string()
        .optional()
        .describe('New description'),
      startDate: tool.schema.string()
        .optional()
        .describe('New start date (ISO format)'),
      endDate: tool.schema.string()
        .optional()
        .describe('New end date (ISO format)'),
      isPrivate: tool.schema.boolean()
        .optional()
        .describe('Update visibility setting'),
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
        if (args.startDate !== undefined) updateData.startDate = args.startDate;
        if (args.endDate !== undefined) updateData.endDate = args.endDate;
        if (args.isPrivate !== undefined) updateData.isPrivate = args.isPrivate;

        const sprint = await client.updateSprint(args.sprintId, updateData);

        return `✅ Space #${sprint.id} updated successfully!`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createSprintDeleteTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Delete a space (use with caution)',
    args: {
      sprintId: tool.schema.number()
        .describe('Sprint ID to delete'),
      confirm: tool.schema.boolean()
        .default(false)
        .describe('Confirm deletion'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      if (!args.confirm) {
        return [
          '⚠️ Warning: This will permanently delete the space and all its stories.',
          '',
          'Use --confirm true to proceed.',
        ].join('\n');
      }

      try {
        await client.deleteSprint(args.sprintId);

        return `✅ Space #${args.sprintId} deleted successfully!`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createSubSprintListTool(client: ForLoopAPIClient) {
  return tool({
    description: 'List all iterations (sub-sprints) within a space',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Sprint ID (defaults to FORLOOP_SPRINT_ID env or current branch)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken()
      if (!tokenResult.valid) return tokenResult.error
      client.setToken?.(tokenResult.token)

      const resolution = await resolveSprintId(args.sprintId, context.directory)
      if (!resolution.sprintId) {
        return 'No sprint ID resolved. Use --sprintId, set FORLOOP_SPRINT_ID, or use a sprint-XXX branch.'
      }
      try {
        const subSprints = await client.getSubSprints(resolution.sprintId)
        if (subSprints.length === 0) {
          return `Space #${resolution.sprintId} has no iterations yet.`
        }
        const lines = [`Iterations for space #${resolution.sprintId}:`, '']
        for (const s of subSprints) {
          const active = s.status === 'in_progress' ? ' ▶ ACTIVE' : ''
          lines.push(
            `  #${s.id}: ${s.title} | ${formatDate(s.startDate)} – ${formatDate(s.endDate)} | ${s.status}${active}`
          )
        }
        return lines.join('\n')
      } catch (error: any) {
        return `Failed to list iterations: ${error.message}`
      }
    },
  })
}

export function createSubSprintCreateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Create a new iteration (sub-sprint). The previously active iteration is auto-completed.',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Sprint ID (defaults to FORLOOP_SPRINT_ID env or current branch)'),
      title: tool.schema.string()
        .optional()
        .describe('Iteration title (auto-generates as "Sprint Title — Iteration N" if not provided)'),
      startDate: tool.schema.string()
        .describe('Start date (YYYY-MM-DD)'),
      endDate: tool.schema.string()
        .describe('End date (YYYY-MM-DD)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken()
      if (!tokenResult.valid) return tokenResult.error
      client.setToken?.(tokenResult.token)

      const resolution = await resolveSprintId(args.sprintId, context.directory)
      if (!resolution.sprintId) {
        return 'No sprint ID resolved. Use --sprintId, set FORLOOP_SPRINT_ID, or use a sprint-XXX branch.'
      }
      if (!args.startDate || !args.endDate) {
        return 'startDate and endDate are required (YYYY-MM-DD format).'
      }
      try {
        const subSprint = await client.createSubSprint(resolution.sprintId, {
          title: args.title,
          startDate: args.startDate,
          endDate: args.endDate,
        })
        return `Iteration created: #${subSprint.id} "${subSprint.title}" (${formatDate(subSprint.startDate)} – ${formatDate(subSprint.endDate)}) status: ${subSprint.status}`
      } catch (error: any) {
        return `Failed to create iteration: ${error.message}`
      }
    },
  })
}

export function createSubSprintUpdateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Update an iteration (sub-sprint) title, dates, or status. Activating an iteration (status: in_progress) auto-completes the previous one.',
    args: {
      subSprintId: tool.schema.number()
        .describe('Sub-sprint ID to update'),
      title: tool.schema.string()
        .optional()
        .describe('New iteration title'),
      startDate: tool.schema.string()
        .optional()
        .describe('New start date (YYYY-MM-DD)'),
      endDate: tool.schema.string()
        .optional()
        .describe('New end date (YYYY-MM-DD)'),
      status: tool.schema.string()
        .optional()
        .describe('New status: planned, in_progress, or completed'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken()
      if (!tokenResult.valid) return tokenResult.error
      client.setToken?.(tokenResult.token)

      if (!args.subSprintId) return 'subSprintId is required.'
      try {
        const updateData: Record<string, unknown> = {}
        if (args.title !== undefined) updateData.title = args.title
        if (args.startDate !== undefined) updateData.startDate = args.startDate
        if (args.endDate !== undefined) updateData.endDate = args.endDate
        if (args.status !== undefined) updateData.status = args.status
        if (Object.keys(updateData).length === 0) return 'No update fields provided.'
        const updated = await client.updateSubSprint(args.subSprintId, updateData)
        return `Iteration updated: #${updated.id} "${updated.title}" status: ${updated.status}`
      } catch (error: any) {
        return `Failed to update iteration: ${error.message}`
      }
    },
  })
}

export function createSubSprintDeleteTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Soft-delete an iteration (sub-sprint). Linked stories retain their subSprintId and will not appear in default space views.',
    args: {
      subSprintId: tool.schema.number()
        .describe('Sub-sprint ID to delete'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken()
      if (!tokenResult.valid) return tokenResult.error
      client.setToken?.(tokenResult.token)

      if (!args.subSprintId) return 'subSprintId is required.'
      try {
        await client.deleteSubSprint(args.subSprintId)
        return `Iteration #${args.subSprintId} deleted.`
      } catch (error: any) {
        return `Failed to delete iteration: ${error.message}`
      }
    },
  })
}
