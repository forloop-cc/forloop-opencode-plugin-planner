import { getToken } from './token-storage';
import { getTokensUrl, isLambdaExecution } from './config';

const AVAILABLE_SCOPES = [
  'sprint:read',
  'sprint:write',
  'story:read',
  'story:write',
  'story:delete',
  'agent:query',
  'profile:read',
] as const;

export type Scope = (typeof AVAILABLE_SCOPES)[number];

export type TokenType = 'api_key' | 'jwt';

export type TokenValidationResult =
  | {
      valid: true;
      token: string;
      tokenType: TokenType;
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Detect token type based on format
 * - API Key: starts with 'floop_'
 * - JWT: contains two dots (header.payload.signature format)
 */
export function detectTokenType(token: string): TokenType | null {
  if (!token) return null;
  
  // API Key format: floop_xxx
  if (token.startsWith('floop_')) {
    return 'api_key';
  }
  
  // JWT format: xxx.yyy.zzz (base64.base64.base64 or base64url.base64url.base64url)
  // Must have exactly 2 dots and at least 3 parts
  const parts = token.split('.');
  if (parts.length === 3 && parts.every(p => p.length > 0)) {
    // Additional check: JWT parts should be base64/base64url encoded
    // Base64url uses - and _ instead of + and /
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    if (parts.every(p => base64urlRegex.test(p))) {
      return 'jwt';
    }
  }
  
  return null;
}

/**
 * Validate token based on execution context
 * 
 * Local workspace: Requires 'floop_*' API key token
 * AWS Lambda: Accepts JWT tokens (passed via EventBridge) or API keys
 */
export async function validateToken(providedToken?: string): Promise<TokenValidationResult> {
  const token = providedToken || (await getToken());

  if (!token) {
    return {
      valid: false,
      error: 'No API token configured. Please create a token at ' + getTokensUrl(),
    };
  }

  const tokenType = detectTokenType(token);
  
  if (!tokenType) {
    return {
      valid: false,
      error: 'Unrecognized token format. Use either a ForLoop API key (floop_*) or a valid JWT token.',
    };
  }

  // In Lambda execution, we accept JWT tokens from EventBridge
  // In local execution, we only accept API keys
  if (tokenType === 'jwt') {
    const isLambda = isLambdaExecution();
    if (!isLambda) {
      return {
        valid: false,
        error: 'JWT tokens are only supported in Lambda execution. Please use a ForLoop API key (floop_*) for local execution.',
      };
    }
    // JWT token accepted in Lambda
    return {
      valid: true,
      token,
      tokenType: 'jwt',
    };
  }

  // API key token - accepted in both local and Lambda
  return {
    valid: true,
    token,
    tokenType: 'api_key',
  };
}

export function hasRequiredScope(tokenScopes: string[], requiredScope: Scope): boolean {
  return tokenScopes.includes(requiredScope);
}

export function formatScopesError(missingScopes: string[]): string {
  return [
    '❌ Insufficient permissions',
    '',
    `Missing required scope${missingScopes.length > 1 ? 's' : ''}: ${missingScopes.join(', ')}`,
    '',
    'Please create a new token with the required scope(s).',
  ].join('\n');
}
