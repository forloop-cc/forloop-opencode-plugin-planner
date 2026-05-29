import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfig } from '../capabilities/config';

const execAsync = promisify(exec);

interface ShellEnvInput {
  directory?: string;
}

interface ShellEnvOutput {
  env: Record<string, string>;
}

export async function injectEnvironment(
  input: ShellEnvInput,
  output: ShellEnvOutput
): Promise<void> {
  const tokenPath = path.join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.config',
    'forloop',
    'tokens.json'
  );

  let token: string | null = null;
  try {
    const content = await fs.readFile(tokenPath, 'utf-8');
    const tokens = JSON.parse(content);
    const profile = process.env.FORLOOP_TOKEN_PROFILE;
    token = (profile && tokens.profiles?.[profile]) || tokens.default || null;
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.warn('[ForLoop] Error reading token file:', error.message);
    }
  }

  if (!token) {
    console.warn('[ForLoop] Token not configured');
    return;
  }

  const config = getConfig();
  output.env.FORLOOP_API_URL = config.apiUrl;
  output.env.FORLOOP_TOKEN_SET = 'true';

  try {
    const result = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: input.directory,
    });
    const branch = result.stdout.trim();
    const match = branch.match(/sprint-(\d+)/);
    
    if (match) {
      output.env.FORLOOP_SPRINT_ID = match[1];
      console.log(`[ForLoop] Detected sprint ${match[1]} from branch ${branch}`);
    }
  } catch (error) {
  }
}
