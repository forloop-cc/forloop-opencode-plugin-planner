import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { resolveSprintId } from '../capabilities/context-resolver';

type RegistryEntry = {
  agentId: string;
  name: string;
  serviceCode?: string | null;
  kind?: 'system' | 'user';
  billingPrice?: number | null;
  billingUnit?: string | null;
  billingCurrency?: string | null;
};

const formatAmount = (value: number, currency: string): string => `${value} ${currency}`;

/**
 * Read-only pre-flight for paid core-service integrations. A paid service
 * debits the app wallet (APP:<sprint publicId>); discovering a shortfall here
 * turns a runtime 402 into an explicit "top up" ask before the Developer starts.
 */
export function createA2ACheckWalletTool(client: ForLoopAPIClient) {
  return tool({
    description:
      'Read the app wallet balance and, for a target core service, its advertised price and the estimated cost/shortfall. Use after choosing a paid core service and before writing the integration brief or starting the Developer. Read-only: it never moves funds.',
    args: {
      agentId: tool.schema
        .string()
        .optional()
        .describe('Target core-service agentId (from core_services_search); omit to read only the balance'),
      quantity: tool.schema
        .number()
        .optional()
        .describe('Expected billable units for the estimate (default 1; e.g. emails or deliveries)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      try {
        const resolution = await resolveSprintId(undefined, context?.directory);
        if (!resolution.sprintId) {
          return '❌ Could not resolve the app space, so the app wallet cannot be read. Ask the user which app this is for (or set the sprint context) and try again.';
        }

        const wallet = await client.getAppWallet(resolution.sprintId);
        const currency = wallet.currency || 'FLC';
        const quantity =
          typeof args.quantity === 'number' && Number.isFinite(args.quantity) && args.quantity > 0
            ? Math.floor(args.quantity)
            : 1;

        const lines = [
          '# App wallet',
          `- appPublicId: \`${wallet.appPublicId}\``,
          `- available: ${formatAmount(wallet.available, currency)}`,
          `- reserved: ${formatAmount(wallet.reserved, currency)}`,
          `- spent: ${formatAmount(wallet.spent, currency)}`,
          `- spend cap: ${wallet.spendCap === null ? 'none' : formatAmount(wallet.spendCap, currency)}`,
        ];

        if (!args.agentId?.trim()) {
          lines.push(
            '',
            'No target service was supplied; only the wallet balance is shown. Pass `agentId` from `core_services_search` to include the price and shortfall.'
          );
          return lines.join('\n');
        }

        const found = await client.searchCoreServices({ query: args.agentId, limit: 50 });
        const target = (found.entries ?? []).find(
          (entry: RegistryEntry) => entry.agentId === args.agentId
        ) as RegistryEntry | undefined;

        if (!target) {
          lines.push(
            '',
            `⚠️ Target \`${args.agentId}\` was not found in the registry. Do not invent a price; re-run \`core_services_search\`.`
          );
          return lines.join('\n');
        }

        const unit = target.billingUnit ? ` per ${target.billingUnit}` : ' per success';
        lines.push('', `## Target: ${target.name} (\`${target.serviceCode ?? target.agentId}\`)`);

        if (target.billingPrice === null || target.billingPrice === undefined) {
          lines.push(
            '- price TBD (not published in the registry yet)',
            '',
            'Price is unknown, so no shortfall can be computed. Check again after the service publishes a price, or ask the user to confirm the expected cost. This check is read-only.'
          );
          return lines.join('\n');
        }

        const price = target.billingPrice;
        const priceCurrency = target.billingCurrency || currency;
        const estimate = price * quantity;
        const shortfall = Math.max(0, estimate - wallet.available);

        lines.push(
          `- unit price: ${formatAmount(price, priceCurrency)}${unit}`,
          `- estimate (${quantity}): ${formatAmount(estimate, priceCurrency)}`,
          `- shortfall: ${formatAmount(shortfall, priceCurrency)}`
        );

        if (shortfall > 0) {
          lines.push(
            '',
            '⚠️ The app wallet is short. Tell the user to top up the app wallet before the Developer starts (App → Credits, or the owner-side `POST /api/ledger/app/:appId/fund`). Starting the Developer now would fail with `402 insufficient_balance`. This check is read-only and does not move funds.'
          );
        } else {
          lines.push(
            '',
            'The wallet covers this estimate. Re-run this check before a large batch; prices and balances change. This check is read-only and does not move funds.'
          );
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error checking the app wallet: ${error.message}`;
      }
    },
  });
}
