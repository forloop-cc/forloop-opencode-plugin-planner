import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { resolveSprintId } from '../capabilities/context-resolver';
import { getConfig } from '../capabilities/config';

type RegistryEntry = {
  agentId: string;
  sprintId: number;
  name: string;
  kind?: 'system' | 'user';
  description: string;
  serviceCode?: string | null;
  baseUrl?: string | null;
  billingPrice?: number | null;
  billingUnit?: string | null;
  billingCurrency?: string | null;
  version?: string | null;
  versionStatus?: string | null;
  sunsetAt?: string | null;
  deprecatedAt?: string | null;
  authMode?: 'none' | 'app' | 'user';
  scopes?: { id: string; tier?: string; description?: string }[];
  tools?: { id: string; name: string; description?: string; whenToUse?: string }[];
  directIntegrable?: boolean;
};

const formatPrice = (entry: RegistryEntry): string => {
  if (entry.billingPrice == null) return 'price TBD';
  const currency = entry.billingCurrency || 'FLC';
  const unit = entry.billingUnit ? ` per ${entry.billingUnit}` : ' per success';
  return `${entry.billingPrice} ${currency}${unit}`;
};

const formatEntry = (entry: RegistryEntry, index: number): string => {
  const lines = [
    `${index + 1}. **${entry.name}** — ${entry.kind === 'system' ? 'ForLoop core service' : 'user app'}`,
    `   - agentId: \`${entry.agentId}\``,
    `   - kind: ${entry.kind ?? 'unknown'}`,
    `   - serviceCode: ${entry.serviceCode ?? 'unknown'}`,
    `   - baseUrl: ${entry.baseUrl ?? 'not published'}`,
    `   - version: ${entry.version ?? 'unspecified'} (${entry.versionStatus ?? 'unknown'})${entry.sunsetAt ? `; sunset ${entry.sunsetAt}` : ''}`,
    `   - price: ${formatPrice(entry)}`,
    `   - auth: ${entry.authMode ?? 'none'}${entry.directIntegrable ? '; direct-integration enabled' : ''}`,
    `   - scopes: ${(entry.scopes ?? []).map((scope) => scope.id).join(', ') || 'none declared'}`,
    `   - description: ${entry.description || '(none)'}`,
  ];
  if (entry.tools?.length) {
    lines.push('   - tools:');
    for (const serviceTool of entry.tools) {
      const guidance = serviceTool.whenToUse
        ? ` — ${serviceTool.whenToUse}`
        : serviceTool.description
          ? ` — ${serviceTool.description}`
          : '';
      lines.push(`     - \`${serviceTool.id}\` (${serviceTool.name})${guidance}`);
    }
  }
  return lines.join('\n');
};

const clientBaseUrl = (): string => {
  const apiUrl = getConfig().apiUrl.replace(/\/+$/, '');
  if (apiUrl.endsWith('api.dev.forloop.cc')) return 'https://dev.forloop.cc';
  if (apiUrl.endsWith('api.forloop.cc')) return 'https://forloop.cc';
  return apiUrl;
};

export function createCoreServicesSearchTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Search ForLoop core services and directly-integrable peers by requirement. Use before designing a capability that may already exist (scheduling, notifications, payments). Results include kind, serviceCode, baseUrl, price, scopes, pinned version and tool guidance. Read-only.',
    args: {
      query: tool.schema
        .string()
        .optional()
        .describe('Requirement sentence or keywords (tokenized; not a whole-phrase match)'),
      tool: tool.schema.string().optional().describe('Tool id to match (e.g. create_schedule)'),
      directOnly: tool.schema
        .boolean()
        .optional()
        .describe('Only return peers that accept direct app integration'),
      limit: tool.schema.number().optional().describe('Maximum results (default 10, max 100)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) return tokenResult.error;
      client.setToken?.(tokenResult.token);

      try {
        const resolution = await resolveSprintId(undefined, context?.directory);
        const result = await client.searchCoreServices({
          ...(args.query ? { query: args.query } : {}),
          ...(args.tool ? { tool: args.tool } : {}),
          ...(args.directOnly ? { directOnly: true } : {}),
          limit: Math.min(Math.max(args.limit ?? 10, 1), 100),
          ...(resolution.sprintId ? { sprintId: resolution.sprintId } : {}),
        });

        if (!result.entries?.length) {
          return 'No matching core service was found. Say so plainly and plan to build the capability instead of inventing a service.';
        }

        return [
          `Found ${result.entries.length} matching service${result.entries.length === 1 ? '' : 's'} (${result.total} total):`,
          '',
          ...result.entries.map((entry, index) => formatEntry(entry as RegistryEntry, index)),
          '',
          'Quote these fields when presenting the option; do not invent endpoints, scopes or versions.',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error searching core services: ${error.message}`;
      }
    },
  });
}

export function createCoreServiceGetTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Read a core service contract (OpenAPI + tool index) plus version status, deprecation and sunset. If version is omitted, the current registry version is resolved first. Read-only.',
    args: {
      agentId: tool.schema.string().describe('Service agentId (sprint public id)'),
      version: tool.schema
        .string()
        .optional()
        .describe('Pinned contract version; omit to use the current registry version'),
    },
    async execute(args) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) return tokenResult.error;
      client.setToken?.(tokenResult.token);

      try {
        let version = args.version?.trim();
        let entry: RegistryEntry | undefined;
        if (!version) {
          const found = await client.searchCoreServices({ query: args.agentId, limit: 50 });
          entry = (found.entries ?? []).find(
            (candidate: RegistryEntry) => candidate.agentId === args.agentId
          ) as RegistryEntry | undefined;
          if (!entry) {
            return `❌ Core service \`${args.agentId}\` was not found in the registry.`;
          }
          if (!entry.version) {
            return `❌ Core service \`${args.agentId}\` has no published contract version.`;
          }
          version = entry.version;
        }

        const contract = await client.getCoreServiceContract(args.agentId, version);
        if (!entry && contract.sunsetAt === undefined) {
          try {
            const found = await client.searchCoreServices({ query: args.agentId, limit: 50 });
            entry = (found.entries ?? []).find(
              (candidate: RegistryEntry) => candidate.agentId === args.agentId
            ) as RegistryEntry | undefined;
          } catch {
            entry = undefined;
          }
        }
        const sunsetAt = contract.sunsetAt ?? entry?.sunsetAt ?? null;
        const deprecatedAt = contract.deprecatedAt ?? entry?.deprecatedAt ?? null;
        const status = contract.status ?? entry?.versionStatus ?? 'unknown';
        const sunset = sunsetAt ? `\n- sunsetAt: ${sunsetAt}` : '\n- sunsetAt: none';
        const deprecated = deprecatedAt ? `\n- deprecatedAt: ${deprecatedAt}` : '';
        return [
          `# ${args.agentId} — contract ${contract.version}`,
          `- status: ${status}`,
          `${sunset}${deprecated}`,
          `- checksum: ${contract.checksum ?? 'unknown'}`,
          '',
          '## OpenAPI',
          '```json',
          JSON.stringify(contract.openapi, null, 2),
          '```',
          '',
          '## Tool index',
          '```json',
          JSON.stringify(contract.index, null, 2),
          '```',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error reading core service contract: ${error.message}`;
      }
    },
  });
}

export function createCoreServiceIntegrationRequestTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Start the user-approval step for a core-service integration: persist (or idempotently reuse) the pending connection request, then ask the signed-in user’s live client to open App Connections focused on it so they only need to click Approve. Falls back to the approval link when the client is offline. This never approves, never touches credentials, and never constructs API URLs by hand.',
    args: {
      agentId: tool.schema.string().describe('Target core-service agentId'),
      scopes: tool.schema
        .array(tool.schema.string())
        .describe('Exact scopes needed (must be declared by the service)'),
      reason: tool.schema
        .string()
        .describe('Why the app needs this integration (shown to the user)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) return tokenResult.error;
      client.setToken?.(tokenResult.token);

      try {
        const found = await client.searchCoreServices({ query: args.agentId, limit: 50 });
        const target = (found.entries ?? []).find(
          (entry: RegistryEntry) => entry.agentId === args.agentId
        ) as RegistryEntry | undefined;
        if (!target) {
          return `❌ Core service \`${args.agentId}\` was not found in the registry. Do not invent a connection request.`;
        }

        const declared = (target.scopes ?? []).map((scope) => scope.id);
        const requested = Array.from(
          new Set((args.scopes ?? []).filter((scope) => typeof scope === 'string' && scope.trim()))
        );
        if (!requested.length) {
          return [
            `❌ No scopes requested for \`${args.agentId}\`.`,
            `Declared scopes: ${declared.join(', ') || 'none'}.`,
          ].join('\n');
        }
        const undeclared = requested.filter((scope) => !declared.includes(scope));
        if (undeclared.length) {
          return [
            `❌ These scopes are not declared by \`${args.agentId}\`: ${undeclared.join(', ')}`,
            `Declared scopes: ${declared.join(', ') || 'none'}.`,
          ].join('\n');
        }

        const resolution = await resolveSprintId(undefined, context?.directory);
        const callerSprintId = resolution.sprintId ?? null;
        const connectionPayload = {
          callerSprintId,
          targetAgentId: args.agentId,
          subjectType: 'app' as const,
          scopes: requested,
        };

        let callerPublicId: string | null = null;
        if (callerSprintId && typeof client.getSprint === 'function') {
          try {
            const callerSprint = await client.getSprint(callerSprintId, {
              includeStories: false,
              includeFiles: false,
            });
            callerPublicId = typeof callerSprint?.publicId === 'string' ? callerSprint.publicId : null;
          } catch {
            // A missing space lookup must not hide the approval instructions.
            callerPublicId = null;
          }
        }

        const spaceUrl = callerPublicId
          ? `${clientBaseUrl()}/myspace/${encodeURIComponent(callerPublicId)}`
          : null;
        const linkParams = new URLSearchParams();
        linkParams.set('connect', args.agentId);
        linkParams.set('scopes', requested.join(','));
        linkParams.set('subject', 'app');
        const fallbackConnectUrl = spaceUrl ? `${spaceUrl}?${linkParams.toString()}` : null;

        // Persist the pending request and nudge the live client to open the
        // panel. Both steps are best-effort: an offline client (or a backend
        // without the request routes) must still return an actionable link.
        let requestId: string | null = null;
        let delivered = false;
        let connectUrl: string | null = fallbackConnectUrl;
        let dropped: string[] = [];
        if (callerSprintId) {
          try {
            const created = await client.createConnectionRequest({
              sprintId: callerSprintId,
              targetAgentId: args.agentId,
              scopes: requested,
              subjectType: 'app',
              requestedBy: 'planner',
              reason: args.reason,
            });
            const request = created?.request ?? {};
            requestId = typeof request.id === 'string' ? request.id : null;
            dropped = Array.isArray(created?.droppedScopes) ? created.droppedScopes : [];
            connectUrl = created?.link ?? request.link ?? connectUrl;

            if (requestId) {
              try {
                const opened = await client.openConnectionRequest(requestId);
                delivered = opened?.delivered === true;
                connectUrl = opened?.link ?? opened?.fallback ?? connectUrl;
              } catch {
                delivered = false;
              }
            }
          } catch {
            // Older backend without request persistence: fall back to the link.
          }
        }

        const manualSteps = connectUrl
          ? [
              `1. Open ${connectUrl}`,
              `   This opens **${target.name}**'s connection panel in this app, with the scopes below and \`This app\` preselected.`,
              '2. Review the service, scopes and price shown above.',
              '3. Click **Approve**.',
            ]
          : [
              `1. Open the app's space${spaceUrl ? `: ${spaceUrl}` : ''}.`,
              '2. Open **Aivy Actions → App Connections (Beta)** and choose the **Connect** tab.',
              `3. Find **${target.name}**, tick the scopes below, choose **This app**, then click **Approve**.`,
            ];

        return [
          delivered
            ? '## App Connections opened — waiting for the app owner to approve'
            : '## Approval needed — the app owner must approve this request',
          `- Service: **${target.name}** (\`${target.agentId}\`)`,
          `- serviceCode: ${target.serviceCode ?? 'unknown'}`,
          `- reason: ${args.reason}`,
          `- scopes: ${requested.join(', ')}`,
          `- cost: ${formatPrice(target)}`,
          ...(requestId ? [`- requestId: \`${requestId}\``] : []),
          ...(dropped.length
            ? [`⚠️ Dropped (not declared by the target manifest): ${dropped.join(', ')}`]
            : []),
          '',
          delivered
            ? 'The App Connections panel is now open on the user’s screen, focused on this request. They only need to click **Approve** — do not paste a link or repeat manual steps.'
            : 'The user’s client was not reachable. Send them this link — it opens the same focused panel so they only need to click **Approve**:',
          ...(delivered ? [] : ['', ...manualSteps]),
          '',
          'A pending request is not a grant. Do not write a connection id into the integration brief until `a2a_check_connections` reports an active connection.',
          'After the user approves, call `a2a_check_connections` to read the real connection id and scopes.',
          '',
          '### Connection payload (owner handoff)',
          '```json',
          JSON.stringify(connectionPayload, null, 2),
          '```',
          '',
          'The planner can never approve. Never send credentials or create the connection from the planner.',
          'If the user cannot or does not complete the approval now, write `Connection: pending owner approval` in the integration brief and continue — do not block the plan and do not ask again.',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error creating integration request: ${error.message}`;
      }
    },
  });
}
