import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';

export function createOrganizationListTool(client: ForLoopAPIClient) {
  return tool({
    description: 'List organizations you belong to',
    args: {
      ownedOnly: tool.schema.boolean()
        .optional()
        .default(false)
        .describe('List only owned organizations'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const orgs = args.ownedOnly
          ? await client.getOwnedOrganizations()
          : await client.listOrganizations();

        const lines: string[] = ['🏢 Organizations:', ''];

        if (orgs.length === 0) {
          return 'No organizations found.';
        }

        for (const org of orgs) {
          const role = org.members?.[0]?.role || 'member';
          const icon = org.type === 'system' ? '🌐' : role === 'owner' ? '👑' : '👤';
          const tier = org.type === 'system' ? '' : ` (${org.type || 'user'})`;

          lines.push(`${icon} #${org.id} **${org.name}**${tier}`);
          lines.push(`   Role: ${role}`);
          if (org.description) {
            lines.push(`   Description: ${org.description}`);
          }
          lines.push('');
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createOrganizationGetTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get details of a specific organization',
    args: {
      organizationId: tool.schema.number()
        .describe('Organization ID to retrieve'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const org = await client.getOrganization(args.organizationId);
        
        const lines: string[] = [
          `🏢 Organization #${org.id}`,
          '',
          `**Name**: ${org.name}`,
          `**Type**: ${org.type || 'user'}`,
        ];
        
        if (org.description) {
          lines.push(`**Description**: ${org.description}`);
        }
        
        if (org.createdAt) {
          lines.push(`**Created**: ${new Date(org.createdAt).toLocaleDateString()}`);
        }
        
        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createOrganizationCreateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Create a new organization (requires Team/Enterprise tier)',
    args: {
      name: tool.schema.string()
        .describe('Organization name'),
      description: tool.schema.string()
        .optional()
        .describe('Organization description'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const profile = await client.getUserProfile();
        if (!['team', 'enterprise'].includes(profile.tier)) {
          return '❌ Creating organizations requires Team or Enterprise tier. Contact support to upgrade.';
        }

        const quotas = await client.getUserQuotas();
        if (quotas.remaining?.ownedOrganizations <= 0) {
          return `❌ Organization limit reached. Maximum: ${quotas.limits?.maxOwnedOrganizations}`;
        }

        const org = await client.createOrganization({
          name: args.name,
          description: args.description,
        });

        return [
          `✅ Organization created successfully!`,
          '',
          `**#${org.id}**: ${org.name}`,
          `**Type**: ${org.type || 'user'}`,
          args.description ? `**Description**: ${args.description}` : null,
        ].filter(Boolean).join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createOrganizationUpdateTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Update organization details (owner only)',
    args: {
      organizationId: tool.schema.number()
        .describe('Organization ID to update'),
      name: tool.schema.string()
        .optional()
        .describe('New name'),
      description: tool.schema.string()
        .optional()
        .describe('New description'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const org = await client.updateOrganization(args.organizationId, {
          name: args.name,
          description: args.description,
        });

        return `✅ Organization #${org.id} updated successfully!`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createOrganizationDeleteTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Delete organization permanently (owner only, irreversible)',
    args: {
      organizationId: tool.schema.number()
        .describe('Organization ID to delete'),
      confirm: tool.schema.boolean()
        .default(false)
        .describe('Type true to confirm deletion'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      if (!args.confirm) {
        return [
          '⚠️ **Warning**: This action is permanent and irreversible!',
          '',
          'All organization data will be deleted:',
          '- All sprints and stories',
          '- All members will be removed',
          '- All files and settings',
          '',
          'Use `--confirm true` to proceed with deletion.',
        ].join('\n');
      }

      try {
        await client.deleteOrganization(args.organizationId);

        return `✅ Organization #${args.organizationId} deleted successfully. This action cannot be undone.`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
