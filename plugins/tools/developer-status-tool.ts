import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { resolveSprintId } from '../capabilities/context-resolver';
import { validateToken } from '../capabilities/auth';

const SFN_ICONS: Record<string, string> = {
  RUNNING: '🚀',
  SUCCEEDED: '✅',
  FAILED: '❌',
  TIMED_OUT: '⏰',
  ABORTED: '🛑',
  NOT_FOUND: '❓',
  ERROR: '⚠️',
};

export function createDeveloperStatusTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Check the status of a running developer task (Step Functions execution + story progress). Use when you want to know if a dispatched developer sprint is still running, completed, or failed.',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected via env/branch/manifest)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const resolution = await resolveSprintId(args.sprintId, context.directory);
      if (!resolution.sprintId) {
        return '❌ No sprint ID available. Provide sprintId or set FORLOOP_SPRINT_ID or ensure ~/.forloop/manifest.json has activeSprintId.';
      }

      try {
        const status = await client.getDeveloperStatus(resolution.sprintId);

        if (!status.hasActiveTask) {
          const sprint = status.sprint || {};
          return [
            '❌ No active developer task',
            '',
            `Sprint #${resolution.sprintId}: ${sprint.storiesDone || 0}/${sprint.storiesTotal || 0} stories done`,
          ].join('\n');
        }

        const task = status.task || {};
        const exec = status.execution || {};
        const sprint = status.sprint || {};
        const execIcon = SFN_ICONS[exec.status] || '❓';

        const lines = [
          `${execIcon} Developer Task: ${exec.status}`,
          '',
          `**Sprint**: #${resolution.sprintId}`,
          `**Task Status**: ${task.status} (${task.id ? task.id.substring(0, 8) : '?'})`,
        ];

        if (exec.startedAt) {
          lines.push(`**Started**: ${new Date(exec.startedAt).toLocaleString()}`);
        }

        if (exec.status === 'RUNNING') {
          const started = new Date(exec.startedAt).getTime();
          const elapsed = Math.floor((Date.now() - started) / 1000);
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          lines.push(`**Elapsed**: ${minutes}m ${seconds}s`);
        }

        if (exec.stoppedAt) {
          lines.push(`**Stopped**: ${new Date(exec.stoppedAt).toLocaleString()}`);
        }

        if (task.branchName) {
          lines.push(`**Branch**: ${task.branchName}`);
        }

        if (task.errorMessage) {
          lines.push(`**Error**: ${task.errorMessage}`);
        }

        if (exec.error) {
          lines.push(`**SFN Error**: ${exec.error}`);
        }

        lines.push('');
        lines.push(`**Sprint Progress**: ${sprint.storiesDone || 0}/${sprint.storiesTotal || 0} done, ${sprint.storiesInProgress || 0} in progress`);

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error checking developer status: ${error.message}`;
      }
    },
  });
}
