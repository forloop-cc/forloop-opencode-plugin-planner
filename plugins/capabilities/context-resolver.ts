import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ContextResolution {
  sprintId?: number;
  branch?: string;
  source: 'provided' | 'env' | 'branch' | 'manifest' | 'config';
}

export async function getCurrentBranch(directory?: string): Promise<string> {
  try {
    const result = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: directory,
    });
    return result.stdout.trim();
  } catch (error) {
    throw new Error('Git not available or not in a repository');
  }
}

export async function resolveSprintFromBranch(branch: string): Promise<number | null> {
  const match = branch.match(/sprint-(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

export async function resolveSprintId(
  providedId?: number,
  directory?: string
): Promise<ContextResolution> {
  if (providedId) {
    return { sprintId: providedId, source: 'provided' };
  }

  const envSprintId = process.env.FORLOOP_SPRINT_ID;
  if (envSprintId) {
    return { sprintId: parseInt(envSprintId, 10), source: 'env' };
  }

  const manifestSprintId = getActiveSprintIdFromManifest(directory);
  if (manifestSprintId) {
    return { sprintId: manifestSprintId, source: 'manifest' };
  }

  try {
    const branch = await getCurrentBranch(directory);
    const sprintId = await resolveSprintFromBranch(branch);
    if (sprintId) {
      return { sprintId, branch, source: 'branch' };
    }
  } catch (error) {
  }

  return { source: 'config' };
}

function getActiveSprintIdFromManifest(directory?: string): number | null {
  const candidates: string[] = [];
  if (directory) {
    candidates.push(path.join(directory, '.forloop', 'manifest.json'));
  }

  const home = process.env.HOME;
  if (home) {
    candidates.push(path.join(home, '.forloop', 'manifest.json'));
  }

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const id = parsed?.activeSprintId;
      if (Number.isFinite(id)) return Number(id);
    } catch {
    }
  }

  return null;
}

export const DEFAULT_HOME = '/tmp/home';

export function getSprintDir(sprintId: number): string {
  return `sprint-${sprintId}`;
}

export function getForloopRoot(sprintId?: number): string {
  const home = process.env.HOME || DEFAULT_HOME;
  const root = path.join(home, '.forloop');
  if (sprintId !== undefined) {
    return path.join(root, getSprintDir(sprintId));
  }
  return root;
}

export function getManifestPath(): string {
  const home = process.env.HOME || DEFAULT_HOME;
  return path.join(home, '.forloop', 'manifest.json');
}
