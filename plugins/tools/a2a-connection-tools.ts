import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { resolveSprintId } from '../capabilities/context-resolver';

type RegistryEntry = {
  agentId: string;
  name: string;
  serviceCode?: string | null;
};

type RequestWire = {
  id: string;
  targetAgentId: string;
  targetSprintId: number;
  scopes: string[];
  subjectType: 'user' | 'app';
  requestedBy: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  connectionId?: string | null;
  expiresAt?: string | null;
  link?: string | null;
};

type ConnectionState = {
  sprintId: number;
  callerPublicId: string | null;
  connections: Array<{
    connectionId: string;
    targetSprintId: number;
    targetAgentId: string | null;
    subjectType: string;
    scopes: string[];
    status: string;
    autoApprove?: boolean;
    expiresAt?: string | null;
  }>;
  requests: RequestWire[];
};

const findEntry = async (client: ForLoopAPIClient, agentId: string): Promise<RegistryEntry | undefined> => {
  const found = await client.searchCoreServices({ query: agentId, limit: 50 });
  return (found.entries ?? []).find((entry: RegistryEntry) => entry.agentId === agentId);
};

const resolveWorkingSprint = async (context: any): Promise<number | null> => {
  const resolution = await resolveSprintId(undefined, context?.directory);
  return resolution.sprintId ?? null;
};

const requestLines = (request: RequestWire): string[] => {
  const lines = [
    `- requestId: \`${request.id}\``,
    `- target: \`${request.targetAgentId}\``,
    `- scopes: ${request.scopes.join(', ') || 'none'}`,
    `- subject: ${request.subjectType === 'app' ? 'this app' : 'you'}`,
    `- requestedBy: ${request.requestedBy}`,
    `- status: **${request.status}**`,
  ];
  if (request.connectionId) lines.push(`- connectionId: \`${request.connectionId}\``);
  // Expiry is an approval deadline for a PENDING request only. An approved
  // request keeps the row for audit; its old 7-day window must not be read as
  // the connection's lifetime.
  if (request.status === 'pending' && request.expiresAt) {
    lines.push(`- approval window expiresAt: ${request.expiresAt}`);
  }
  if (request.reason) lines.push(`- reason: ${request.reason}`);
  lines.push(`- approval link: ${request.link || '(open App Connections → Connect)'}`);
  return lines;
};

// Planner-side write: records a request for the working sprint's app owner.
// It never creates an A2AConnection and cannot approve.
export function createA2ARequestConnectionTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Create (or idempotently reuse) a connection request for the current sprint: the app asks a service/peer for an exact scope set. The request is persisted and visible in App Connections, but the planner can never approve it — the signed-in owner must click Approve. Returns the request id and a deep link. Use before writing an integration brief that depends on an external service.',
    args: {
      agentId: tool.schema.string().describe('Target service/peer agentId (public id)'),
      scopes: tool.schema
        .array(tool.schema.string())
        .describe('Exact scopes the integration needs (clamped to the target manifest)'),
      reason: tool.schema
        .string()
        .optional()
        .describe('Why the app needs this connection (shown to the approving user)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) return tokenResult.error;
      client.setToken?.(tokenResult.token);

      try {
        const target = await findEntry(client, args.agentId);
        if (!target) {
          return `❌ Target \`${args.agentId}\` was not found in the registry. Do not invent a connection request.`;
        }
        const sprintId = await resolveWorkingSprint(context);
        if (!sprintId) {
          return '❌ Could not resolve the working sprint. Open the planner from an app space, then retry.';
        }
        const requested = Array.from(
          new Set((args.scopes ?? []).map(scope => scope.trim()).filter(Boolean))
        );
        if (!requested.length) {
          return `❌ No scopes requested for \`${args.agentId}\`. Nothing was created.`;
        }

        const result = await client.createConnectionRequest({
          sprintId,
          targetAgentId: args.agentId,
          scopes: requested,
          subjectType: 'app',
          requestedBy: 'planner',
          ...(args.reason ? { reason: args.reason } : {}),
        });
        const request = result.request as RequestWire;
        const dropped = Array.isArray(result.droppedScopes) ? result.droppedScopes : [];

        return [
          request.status === 'approved'
            ? '## Connection already approved'
            : '## Connection request created — waiting for the app owner',
          '',
          `- target: **${target.name}** (\`${target.agentId}\`)`,
          ...requestLines({ ...request, link: result.link ?? request.link }),
          ...(dropped.length
            ? ['', `⚠️ Dropped (not declared by the target manifest): ${dropped.join(', ')}`]
            : []),
          '',
          'The planner cannot approve this. Ask the user to click **Approve** in App Connections, or call `a2a_open_connection_request` to bring the panel forward.',
          'Do **not** write the connection id into a brief until `a2a_check_connections` reports an active connection — a pending request is not a grant.',
          'If the user replies that they approved, call `a2a_check_connections` to read the real connection id and scopes.',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error creating the connection request: ${error.message}`;
      }
    },
  });
}

// Planner-side read: the working sprint's real connections + request statuses.
// This is how the planner learns the connection id after the user approves.
export function createA2ACheckConnectionsTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Read the current sprint’s active A2A connections (real connection ids + granted scopes) and its connection requests with statuses. Use after the user says they approved, and before writing a brief that references a connection id. Read-only.',
    args: {
      sprintId: tool.schema
        .number()
        .optional()
        .describe('Sprint to inspect; defaults to the working sprint'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) return tokenResult.error;
      client.setToken?.(tokenResult.token);

      try {
        const sprintId = args.sprintId ?? (await resolveWorkingSprint(context));
        if (!sprintId) return '❌ Could not resolve the working sprint.';

        const state = (await client.getConnectionState(sprintId)) as ConnectionState;
        const connections = state.connections ?? [];
        const requests = state.requests ?? [];
        const lines: string[] = [];

        if (!connections.length) {
          lines.push('## Active connections', '', 'None. No integration can be called yet.');
        } else {
          lines.push(`## Active connections (${connections.length})`, '');
          for (const connection of connections) {
            lines.push(
              `- Connection ID: \`${connection.connectionId}\``,
              `  - target: \`${connection.targetAgentId ?? connection.targetSprintId}\` (sprint ${connection.targetSprintId})`,
              `  - scopes: ${connection.scopes.join(', ') || 'none'}`,
              `  - subject: ${connection.subjectType === 'app' ? 'this app' : 'the user'}`,
              `  - status: ${connection.status}${connection.autoApprove ? ' (always allow)' : ''}`,
            );
            const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : null;
            if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
              // Approved grants are permanent by default; only revocation (or a
              // target disconnect/delete) ends them.
              lines.push('  - expires: no expiry (until revoked)');
            } else {
              const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
              const renewHint = daysLeft <= 14
                ? ' — renews automatically on use; re-request if it lapses'
                : '';
              lines.push(`  - expires: ${expiresAt.toISOString()} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left${renewHint})`);
            }
          }
        }

        lines.push('', `## Connection requests (${requests.length})`, '');
        if (!requests.length) {
          lines.push('None.');
        } else {
          for (const request of requests) {
            lines.push(...requestLines(request), '');
          }
        }

        const pending = requests.filter(request => request.status === 'pending');
        const approved = requests.filter(request => request.status === 'approved' && request.connectionId);
        if (pending.length) {
          lines.push(
            `${pending.length} request${pending.length === 1 ? ' is' : 's are'} still pending. The user must approve before the integration exists.`,
          );
        } else if (approved.length) {
          lines.push(
            'Approved request(s) above carry the real connection id — use that id and its granted scopes in the brief. Do not widen the scopes.',
          );
        }
        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error reading connections: ${error.message}`;
      }
    },
  });
}

// Planner-side nudge: ask the user's client to open App Connections focused on
// the pending request (or create one from target+scopes first). The link is
// ALWAYS returned so an offline client still gets an actionable fallback.
export function createA2AOpenConnectionRequestTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Open the user’s App Connections panel focused on a pending connection request, so they only need to click Approve. Accepts a request id or target+scopes (creates the request if needed). Emits a platform socket action to the live client; when the client is offline the response still contains the request id and the approval link. This never approves.',
    args: {
      requestId: tool.schema
        .string()
        .optional()
        .describe('Existing connection request id'),
      agentId: tool.schema
        .string()
        .optional()
        .describe('Target agentId when the request id is unknown'),
      scopes: tool.schema
        .array(tool.schema.string())
        .optional()
        .describe('Exact scopes for the request when creating/looking it up'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) return tokenResult.error;
      client.setToken?.(tokenResult.token);

      try {
        const sprintId = await resolveWorkingSprint(context);
        if (!sprintId) return '❌ Could not resolve the working sprint.';

        let requestId = args.requestId?.trim() || '';
        let link: string | null = null;

        if (!requestId) {
          if (!args.agentId) {
            return '❌ Provide a request id, or a target agentId (and scopes) so the request can be created.';
          }
          const state = (await client.getConnectionState(sprintId)) as ConnectionState;
          const wanted = new Set((args.scopes ?? []).map(scope => scope.trim()).filter(Boolean));
          const match = (state.requests ?? []).find(request => {
            if (request.targetAgentId !== args.agentId) return false;
            if (request.status !== 'pending' && request.status !== 'approved') return false;
            if (!wanted.size) return true;
            return (
              request.scopes.length === wanted.size &&
              request.scopes.every(scope => wanted.has(scope))
            );
          });
          if (match) {
            requestId = match.id;
            link = match.link ?? null;
          } else {
            if (!wanted.size) {
              return `❌ No pending request for \`${args.agentId}\`. Call \`a2a_request_connection\` with scopes first.`;
            }
            const created = await client.createConnectionRequest({
              sprintId,
              targetAgentId: args.agentId,
              scopes: [...wanted],
              subjectType: 'app',
              requestedBy: 'planner',
            });
            requestId = created.request?.id ?? '';
            link = created.link ?? created.request?.link ?? null;
          }
        }

        if (!requestId) return '❌ Could not create or find a connection request.';

        const opened = await client.openConnectionRequest(requestId);
        const finalLink = opened.link ?? link;
        const delivered = opened.delivered === true;

        return [
          delivered
            ? '## App Connections opened for the user'
            : '## Link ready — the user’s client was not reachable',
          '',
          `- requestId: \`${opened.requestId ?? requestId}\``,
          `- socket delivered: ${delivered ? 'yes' : 'no'}`,
          `- approval link: ${finalLink || '(open App Connections → Connect)'}`,
          '',
          delivered
            ? 'The panel should now be focused on this request. The user still has to click **Approve** — the planner cannot approve.'
            : 'Send the approval link to the user. It opens App Connections focused on this request so they only need to click **Approve**.',
          'After they approve, call `a2a_check_connections` to resolve the real connection id and scopes.',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error opening the connection request: ${error.message}`;
      }
    },
  });
}
