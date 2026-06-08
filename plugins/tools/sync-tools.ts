import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { resolveSprintId, getForloopRoot as getForloopRootPath } from '../capabilities/context-resolver';
import { contentTypeFromExtension } from '../capabilities/mime-types';
import * as fs from 'fs';
import * as path from 'path';

type SyncAction = 'upsert' | 'delete';

type SyncManifestEntry = {
  fileId: number;
  folder: string;
  originalName: string;
  size: number;
  syncedAt: string;
};

type SyncManifest = {
  version: 1;
  sprintId: number | null;
  files: Record<string, SyncManifestEntry>;
};

export function createAivyDocFolderEnsureTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Ensure a doc_folder titled "forloop Aivy doc" exists in the working sprint',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected via env/branch/manifest)'),
      title: tool.schema.string()
        .optional()
        .default('forloop Aivy doc')
        .describe('Doc folder title'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const resolution = await resolveSprintId(args.sprintId, context.directory);
      if (!resolution.sprintId) {
        return '❌ No sprint ID available. Provide --sprintId or set FORLOOP_SPRINT_ID or ensure ~/.forloop/manifest.json has activeSprintId.';
      }

      const sprint = await client.getSprint(resolution.sprintId, { includeStories: true, includeFiles: false });
      const stories = Array.isArray(sprint?.stories) ? sprint.stories : [];
      const effectiveTitle = String(args.title || '').trim() || 'forloop Aivy doc';
      const desiredTitle = effectiveTitle.toLowerCase();

      const existing = stories.find((s: any) => {
        const type = String(s?.type || '');
        const title = String(s?.title || '').trim().toLowerCase();
        return type === 'doc_folder' && title === desiredTitle;
      });

      if (existing?.id) {
        return `✅ Doc folder already exists: #${existing.id} "${existing.title}" (Sprint #${resolution.sprintId})`;
      }

      const created = await client.createStory({
        sprintId: resolution.sprintId,
        type: 'doc_folder',
        title: effectiveTitle,
        description: 'Auto-created folder for forloop Aivy document sync',
        status: 'todo',
      });

      return `✅ Created doc folder: #${created.id} "${created.title}" (Sprint #${resolution.sprintId})`;
    },
  });
}

export function createAivyDocFolderGetTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get the doc_folder story ID for linking files',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected via env/branch/manifest)'),
      title: tool.schema.string()
        .optional()
        .default('forloop Aivy doc')
        .describe('Doc folder title'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const resolution = await resolveSprintId(args.sprintId, context.directory);
      if (!resolution.sprintId) {
        return '❌ No sprint ID available.';
      }

      const sprint = await client.getSprint(resolution.sprintId, { includeStories: true, includeFiles: false });
      const stories = Array.isArray(sprint?.stories) ? sprint.stories : [];
      const effectiveTitle = String(args.title || '').trim() || 'forloop Aivy doc';
      const desiredTitle = effectiveTitle.toLowerCase();

      const existing = stories.find((s: any) => {
        const type = String(s?.type || '');
        const title = String(s?.title || '').trim().toLowerCase();
        return type === 'doc_folder' && title === desiredTitle;
      });

      if (existing?.id) {
        return `📁 Doc folder found: #${existing.id} "${existing.title}" (Sprint #${resolution.sprintId})`;
      }

      return `❌ Doc folder not found. Run forloopSyncAivyFolder first.`;
    },
  });
}

export function createS3ToLocalSyncTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Sync remote sprint files (S3) to local ~/.forloop/* structure',
    args: {
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected via env/branch/manifest)'),
      syncKnowledge: tool.schema.boolean()
        .default(true)
        .describe('Sync knowledge files'),
      syncPlans: tool.schema.boolean()
        .default(true)
        .describe('Sync plan files'),
      syncTasks: tool.schema.boolean()
        .default(true)
        .describe('Sync task files'),
      overwrite: tool.schema.boolean()
        .default(false)
        .describe('Overwrite local files even if size matches'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const resolution = await resolveSprintId(args.sprintId, context.directory);
      if (!resolution.sprintId) {
        return '❌ No sprint ID available. Provide --sprintId or set FORLOOP_SPRINT_ID or ensure ~/.forloop/manifest.json has activeSprintId.';
      }

      const forloopRoot = resolveForloopRoot(context.directory, resolution.sprintId);
      ensureForloopStructure(forloopRoot, resolution.sprintId);

      const manifestPath = getSyncManifestPath(forloopRoot);
      const manifest = readSyncManifest(manifestPath, resolution.sprintId);
      const files = await client.getSprintFiles(resolution.sprintId);

      const candidates = files
        .map((f: any) => {
          const mapping = mapRemoteFileToLocalRelPath(f);
          return mapping ? { file: f, mapping } : null;
        })
        .filter((x): x is { file: any; mapping: NonNullable<ReturnType<typeof mapRemoteFileToLocalRelPath>> } => x !== null);

      const selectedKinds = new Set<string>();
      if (args.syncKnowledge) selectedKinds.add('knowledge');
      if (args.syncPlans) selectedKinds.add('plan');
      if (args.syncTasks) selectedKinds.add('task');

      const byRelPath = new Map<string, any>();
      for (const item of candidates) {
        if (!selectedKinds.has(item.mapping.kind)) continue;
        const key = item.mapping.relPath;
        const prev = byRelPath.get(key);
        if (!prev || compareCreatedAt(item.file, prev.file) > 0) {
          byRelPath.set(key, item);
        }
      }

      let downloaded = 0;
      let skipped = 0;
      let failed = 0;

      for (const [relPath, item] of byRelPath.entries()) {
        const localPath = path.join(forloopRoot, relPath);
        const shouldDownload = shouldDownloadRemoteToLocal({
          localPath,
          remoteSize: Number(item.file?.size) || 0,
          overwrite: Boolean(args.overwrite),
        });

        if (!shouldDownload) {
          skipped += 1;
          continue;
        }

        try {
          const open = await client.getFileOpenUrl(Number(item.file.id));
          const url = String(open?.url || '');
          if (!url) throw new Error('Missing open URL');

          await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Download failed (${res.status})`);
          }
          const buf = Buffer.from(await res.arrayBuffer());
          await fs.promises.writeFile(localPath, buf);

          manifest.files[relPath] = {
            fileId: Number(item.file.id),
            folder: item.mapping.folder,
            originalName: String(item.file.originalName || item.file.filename || path.basename(relPath)),
            size: buf.length,
            syncedAt: new Date().toISOString(),
          };

          downloaded += 1;
        } catch {
          failed += 1;
        }
      }

      writeSyncManifest(manifestPath, manifest);

      return [
        `✅ S3→Local sync complete (Sprint #${resolution.sprintId})`,
        `Downloaded: ${downloaded}`,
        `Skipped: ${skipped}`,
        `Failed: ${failed}`,
        `Local root: ${forloopRoot}`,
      ].join('\n');
    },
  });
}

export function createLocalToS3SyncTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Sync a local ~/.forloop/* file to Sprint S3 (upload or delete)',
    args: {
      filePath: tool.schema.string()
        .describe('Local file path under ~/.forloop/*'),
      sprintId: tool.schema.number()
        .optional()
        .describe('Target sprint ID (auto-detected via env/branch/manifest)'),
      action: tool.schema.enum(['upsert', 'delete'])
        .optional()
        .default('upsert')
        .describe('Sync action'),
      folder: tool.schema.string()
        .optional()
        .describe('Override remote folder (default inferred from local path)'),
      storyId: tool.schema.number()
        .optional()
        .describe('Link file to a story (e.g., doc_folder story for logical grouping)'),
    },
    async execute(args, context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error;
      }
      client.setToken?.(tokenResult.token);

      const resolution = await resolveSprintId(args.sprintId, context.directory);
      if (!resolution.sprintId) {
        return '❌ No sprint ID available. Provide --sprintId or set FORLOOP_SPRINT_ID or ensure ~/.forloop/manifest.json has activeSprintId.';
      }

      const forloopRoot = resolveForloopRoot(context.directory, resolution.sprintId);
      ensureForloopStructure(forloopRoot, resolution.sprintId);

      const absPath = resolveToAbsolutePath(args.filePath, context.directory);
      const relPath = toForloopRelativePath(absPath, forloopRoot);
      if (!relPath) {
        return `❌ filePath must be under ${forloopRoot}`;
      }

      const manifestPath = getSyncManifestPath(forloopRoot);
      const manifest = readSyncManifest(manifestPath, resolution.sprintId);
      const existing = manifest.files[relPath];

      const action = args.action as SyncAction;
      const inferredFolder = args.folder || inferRemoteFolderFromRelPath(relPath);

      if (action === 'delete') {
        if (existing?.fileId) {
          await client.deleteFile(existing.fileId);
          delete manifest.files[relPath];
          writeSyncManifest(manifestPath, manifest);
          return `✅ Deleted remote file #${existing.fileId} for ${relPath}`;
        }
        return `🟡 No remote mapping found for ${relPath}`;
      }

      if (!fs.existsSync(absPath)) {
        return `❌ File not found: ${absPath}`;
      }

      if (existing?.fileId) {
        await client.deleteFile(existing.fileId);
      }

      const fileBuf = await fs.promises.readFile(absPath);
      const originalName = path.basename(absPath);
      const contentType = contentTypeFromExtension(path.extname(originalName));

      const presign = await client.createPresignedUpload({
        sprintId: resolution.sprintId,
        contentType,
        originalName,
        folder: inferredFolder,
      });

      const uploadResponse = await fetch(String(presign?.uploadUrl), {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileBuf.length),
        },
        body: fileBuf,
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text().catch(() => '');
        return `❌ Upload failed (${uploadResponse.status}): ${text || uploadResponse.statusText}`;
      }

      const completed = await client.completeUpload({
        sprintId: resolution.sprintId,
        fileName: presign.fileName,
        originalName,
        fileType: contentType,
        size: fileBuf.length,
        folder: inferredFolder,
        x: 0,
        y: 0,
        storyId: args.storyId,
      });

      const fileId = Number(completed?.id || completed?.file?.id || completed?.fileId);
      if (!Number.isFinite(fileId)) {
        return '❌ Upload completed but remote file id is missing in response.';
      }

      manifest.files[relPath] = {
        fileId,
        folder: inferredFolder,
        originalName,
        size: fileBuf.length,
        syncedAt: new Date().toISOString(),
      };
      writeSyncManifest(manifestPath, manifest);

      return [
        `✅ Local→S3 sync complete`,
        `Sprint: #${resolution.sprintId}`,
        `File: ${relPath}`,
        `Remote fileId: #${fileId}`,
        `Folder: ${inferredFolder}`,
      ].join('\n');
    },
  });
}

function resolveForloopRoot(contextDir?: string, sprintId?: number): string {
  if (sprintId !== undefined) {
    return getForloopRootPath(sprintId);
  }

  if (contextDir) {
    const local = path.join(contextDir, '.forloop');
    if (fs.existsSync(local) && fs.statSync(local).isDirectory()) return local;
  }

  return getForloopRootPath();
}

function ensureForloopStructure(forloopRoot: string, sprintId?: number) {
  fs.mkdirSync(forloopRoot, { recursive: true });

  if (sprintId !== undefined) {
    fs.mkdirSync(path.join(forloopRoot, 'knowledge'), { recursive: true });
    fs.mkdirSync(path.join(forloopRoot, 'plan'), { recursive: true });
    fs.mkdirSync(path.join(forloopRoot, 'task'), { recursive: true });
  }

  fs.mkdirSync(path.join(getForloopRootPath(), 'sync'), { recursive: true });
}

function getSyncManifestPath(forloopRoot?: string): string {
  const syncRoot = path.join(getForloopRootPath(), 'sync');
  return path.join(syncRoot, 'manifest.json');
}

function readSyncManifest(manifestPath: string, sprintId: number): SyncManifest {
  try {
    if (fs.existsSync(manifestPath)) {
      const raw = fs.readFileSync(manifestPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && parsed?.files && typeof parsed.files === 'object') {
        return {
          version: 1,
          sprintId: Number.isFinite(parsed.sprintId) ? Number(parsed.sprintId) : sprintId,
          files: parsed.files as Record<string, SyncManifestEntry>,
        };
      }
    }
  } catch {
  }
  return { version: 1, sprintId, files: {} };
}

function writeSyncManifest(manifestPath: string, manifest: SyncManifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function resolveToAbsolutePath(inputPath: string, contextDir?: string): string {
  if (path.isAbsolute(inputPath)) return inputPath;
  const base = contextDir || process.cwd();
  return path.join(base, inputPath);
}

function toForloopRelativePath(absPath: string, forloopRoot: string): string | null {
  const normalizedRoot = path.resolve(forloopRoot);
  const normalizedPath = path.resolve(absPath);
  if (!normalizedPath.startsWith(normalizedRoot + path.sep)) return null;
  return path.relative(normalizedRoot, normalizedPath);
}

function inferRemoteFolderFromRelPath(relPath: string): string {
  // Normalize path separators to handle both Unix and Windows
  const normalizedRelPath = relPath.replace(/\\/g, '/');
  const parts = normalizedRelPath.split('/');
  const first = parts[0];
  if (first === 'knowledge') return 'project/knowledge';
  if (first === 'plan') return 'project/plans';
  if (first === 'task') return 'project/tasks';
  return 'project';
}

function mapRemoteFileToLocalRelPath(file: any): { kind: 'knowledge' | 'plan' | 'task'; folder: string; relPath: string } | null {
  const storageKey = String(file?.storageKey || file?.s3Url || file?.url || '');
  const name = String(file?.originalName || file?.filename || '').trim();
  const lowerName = name.toLowerCase();

  const keyLower = storageKey.toLowerCase();
  if (keyLower.includes('/project/knowledge/')) {
    return { kind: 'knowledge', folder: 'project/knowledge', relPath: path.join('knowledge', path.basename(name || 'remote')) };
  }
  if (keyLower.includes('/project/plans/')) {
    return { kind: 'plan', folder: 'project/plans', relPath: path.join('plan', path.basename(name || 'remote')) };
  }
  if (keyLower.includes('/project/tasks/')) {
    return { kind: 'task', folder: 'project/tasks', relPath: path.join('task', path.basename(name || 'remote')) };
  }

  if (lowerName.startsWith('knowledge-')) {
    return { kind: 'knowledge', folder: 'project/knowledge', relPath: path.join('knowledge', path.basename(name)) };
  }
  if (lowerName.startsWith('plan-')) {
    return { kind: 'plan', folder: 'project/plans', relPath: path.join('plan', path.basename(name)) };
  }
  if (lowerName.startsWith('task-')) {
    return { kind: 'task', folder: 'project/tasks', relPath: path.join('task', path.basename(name)) };
  }

  return null;
}

function compareCreatedAt(a: any, b: any): number {
  const da = Date.parse(String(a?.createdAt || ''));
  const db = Date.parse(String(b?.createdAt || ''));
  if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
  if (Number.isFinite(da)) return 1;
  if (Number.isFinite(db)) return -1;
  return 0;
}

function shouldDownloadRemoteToLocal(params: { localPath: string; remoteSize: number; overwrite: boolean }): boolean {
  if (params.overwrite) return true;
  try {
    if (!fs.existsSync(params.localPath)) return true;
    const stat = fs.statSync(params.localPath);
    if (!stat.isFile()) return true;
    if (!params.remoteSize) return false;
    return stat.size !== params.remoteSize;
  } catch {
    return true;
  }
}
