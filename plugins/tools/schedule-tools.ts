import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { resolveSprintId } from '../capabilities/context-resolver';

export function createScheduleTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Schedule a meeting with attendees (uses specialized schedule story type)',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Sprint ID (auto-detected from branch or env if not provided)'),
      title: tool.schema.string()
        .describe('Meeting title'),
      description: tool.schema.string()
        .optional()
        .describe('Meeting description or agenda'),
      startAt: tool.schema.string()
        .describe('Meeting start time (ISO format: YYYY-MM-DDTHH:MM:SSZ)'),
      endAt: tool.schema.string()
        .describe('Meeting end time (ISO format: YYYY-MM-DDTHH:MM:SSZ)'),
      timezone: tool.schema.string()
        .optional()
        .default('UTC')
        .describe('Timezone (e.g., "America/Los_Angeles")'),
      videoUrl: tool.schema.string()
        .optional()
        .describe('Video meeting URL (Zoom, Google Meet, etc.)'),
      location: tool.schema.string()
        .optional()
        .describe('Physical meeting location'),
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

        // Build schedule metadata
        const scheduleMetadata = {
          title: args.title,
          description: args.description,
          startAt: args.startAt,
          endAt: args.endAt,
          timezone: args.timezone,
          videoUrl: args.videoUrl,
          location: args.location,
        };

        // Create schedule story
        const story = await client.createStory({
          title: args.title,
          description: args.description,
          sprintId: resolution.sprintId,
          type: 'schedule',
          metadata: JSON.stringify(scheduleMetadata),
          status: 'todo',
        });

        const formatDateTime = (isoString: string) => {
          try {
            const date = new Date(isoString);
            return date.toLocaleString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            });
          } catch {
            return isoString;
          }
        };

        const lines: string[] = [
          `✅ Meeting scheduled successfully!`,
          '',
          `**#${story.id}**: ${story.title}`,
          `**Sprint**: #${resolution.sprintId}`,
          `**When**: ${formatDateTime(args.startAt)} - ${formatDateTime(args.endAt)}`,
        ];
        if (args.videoUrl) lines.push(`**Video**: ${args.videoUrl}`);
        if (args.location) lines.push(`**Location**: ${args.location}`);

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createScheduleUpdateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Update an existing schedule/meeting',
    args: {
      storyId: tool.schema.number()
        .describe('Schedule story ID to update'),
      title: tool.schema.string()
        .optional()
        .describe('New title'),
      description: tool.schema.string()
        .optional()
        .describe('New description'),
      startAt: tool.schema.string()
        .optional()
        .describe('New start time'),
      endAt: tool.schema.string()
        .optional()
        .describe('New end time'),
      videoUrl: tool.schema.string()
        .optional()
        .describe('New video URL'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        // Get current story to merge metadata
        const story = await client.getStory(args.storyId);
        
        if (story.type !== 'schedule') {
          return `❌ Story #${args.storyId} is not a schedule meeting. Type: ${story.type}`;
        }

        // Parse existing metadata
        const existingMetadata = story.metadata ? JSON.parse(story.metadata) : {};
        
        // Update with new values
        const updatedMetadata = {
          ...existingMetadata,
          title: args.title !== undefined ? args.title : existingMetadata.title,
          description: args.description !== undefined ? args.description : existingMetadata.description,
          startAt: args.startAt !== undefined ? args.startAt : existingMetadata.startAt,
          endAt: args.endAt !== undefined ? args.endAt : existingMetadata.endAt,
          videoUrl: args.videoUrl !== undefined ? args.videoUrl : existingMetadata.videoUrl,
        };

        // Update story
        await client.updateStory(args.storyId, {
          title: args.title,
          description: args.description,
          metadata: updatedMetadata,
        });

        return `✅ Schedule #${args.storyId} updated successfully!`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
