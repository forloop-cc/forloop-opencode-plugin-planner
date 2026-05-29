import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';

export function createUserProfileTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get current user profile information (name, email, tier)',
    args: {},
    async execute(_args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const profile = await client.getUserProfile();
        
        const lines: string[] = [
          `👤 User Profile`,
          '',
          `**Name**: ${profile.name || 'Not set'}`,
          `**Email**: ${profile.email}`,
          `**Tier**: ${profile.tier || 'free'}`,
        ];
        
        if (profile.bio) {
          lines.push(`**Bio**: ${profile.bio}`);
        }
        
        if (profile.avatarUrl) {
          lines.push(`**Avatar**: ${profile.avatarUrl}`);
        }
        
        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createUserQuotasTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Check user quota limits and usage (organizations, sprints, storage)',
    args: {},
    async execute(_args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const quotas = await client.getUserQuotas();
        
        const formatBytes = (bytes: string) => {
          const num = parseInt(bytes, 10);
          if (num === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(num) / Math.log(k));
          return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        const lines: string[] = [
          `📊 Quota Usage (${quotas.tier || 'free'} tier)`,
          '',
        ];
        
        // Organizations
        lines.push(`**Organizations**: ${quotas.remaining?.ownedOrganizations ?? '?'}/${quotas.limits?.maxOwnedOrganizations ?? '?'}`);
        
        // System Sprints
        lines.push(`**System Sprints**: ${quotas.remaining?.systemSpaces ?? '?'}/${quotas.limits?.maxSystemSprints ?? '?'}`);
        
        // Storage
        const storageUsed = formatBytes(quotas.usage?.storageUsedBytes || '0');
        const storageLimit = formatBytes(quotas.limits?.maxStorageBytes || '0');
        lines.push(`**Storage**: ${storageUsed} / ${storageLimit}`);
        
        // Free tier stories
        if (quotas.tier === 'free') {
          lines.push(`**Free Stories**: ${quotas.remaining?.freeStories ?? '?'}/${quotas.limits?.maxStoriesPerFreeSystemSprint ?? '?'}`);
        }
        
        // Owned organizations usage
        if (quotas.ownedOrgsUsage && quotas.ownedOrgsUsage.length > 0) {
          lines.push('');
          lines.push('**Owned Organizations:**');
          for (const org of quotas.ownedOrgsUsage) {
            lines.push(`  - ${org.name}: ${org.spacesUsed}/${org.spacesLimit} sprints`);
          }
        }
        
        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createOrganizationQuotasTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get quota information for a specific organization',
    args: {
      organizationId: tool.schema.number()
        .describe('Organization ID to check quotas for'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const quotas = await client.getOrganizationQuotas(args.organizationId);
        
        const lines: string[] = [
          `📊 Organization Quotas`,
          '',
          `**Organization**: ${quotas.organization?.name || `#${quotas.organization?.id}`}`,
          `**Type**: ${quotas.organization?.type || 'user'}`,
        ];
        
        if (quotas.limits) {
          lines.push('');
          lines.push('**Limits:**');
          lines.push(`  - Storage: ${parseInt(quotas.limits.maxStorageBytes).toLocaleString()} bytes`);
        }
        
        if (quotas.usage) {
          lines.push('');
          lines.push('**Usage:**');
          lines.push(`  - Sprints: ${quotas.usage.spacesUsed}`);
        }
        
        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
