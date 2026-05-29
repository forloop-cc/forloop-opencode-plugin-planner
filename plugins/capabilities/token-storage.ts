import { promises as fs } from 'fs';
import path from 'path';

export interface TokenProfile {
  version: string;  // Schema version for future migrations
  default?: string;
  profiles?: Record<string, string>;
  lastUpdated: string;
  note: string;  // Clear indication this is ForLoop-specific
}

const getTokenPath = (): string => {
  return path.join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.config',
    'forloop',
    'tokens.json'
  );
};

export async function loadTokens(): Promise<TokenProfile> {
  const tokenPath = getTokenPath();
  
  try {
    const content = await fs.readFile(tokenPath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { 
        version: '1.0',
        note: 'ForLoop API tokens - do not share',
        lastUpdated: new Date().toISOString() 
      };
    }
    throw error;
  }
}

export async function saveTokens(tokens: TokenProfile): Promise<void> {
  const tokenPath = getTokenPath();
  const configDir = path.dirname(tokenPath);
  
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    tokenPath,
    JSON.stringify(tokens, null, 2),
    { mode: 0o600 }
  );
}

export async function getToken(profile?: string): Promise<string | null> {
  const tokens = await loadTokens();
  
  if (profile && tokens.profiles?.[profile]) {
    return tokens.profiles[profile];
  }
  
  // Check top-level default first, then fall back to profiles["default"]
  if (tokens.default) return tokens.default;
  if (tokens.profiles?.['default']) return tokens.profiles['default'];
  
  return null;
}

export async function setToken(token: string, profile?: string): Promise<void> {
  const tokens = await loadTokens();
  
  // Ensure version and note are set
  tokens.version = '1.0';
  tokens.note = 'ForLoop API tokens - do not share';
  
  if (profile) {
    if (!tokens.profiles) {
      tokens.profiles = {};
    }
    tokens.profiles[profile] = token;
  } else {
    tokens.default = token;
  }
  
  tokens.lastUpdated = new Date().toISOString();
  await saveTokens(tokens);
}
