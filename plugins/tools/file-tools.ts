import { tool } from '@opencode-ai/plugin';
import { ForLoopAPIClient } from '../capabilities/api-client';
import { validateToken } from '../capabilities/auth';
import { contentTypeFromExtension, formatFileSize } from '../capabilities/mime-types';
import * as fs from 'fs';
import * as path from 'path';

export function createFileUploadTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Upload a file to a sprint (supports presigned S3 upload)',
    args: {
      filePath: tool.schema.string()
        .describe('Local file path to upload'),
      sprintId: tool.schema.number()
        .describe('Target sprint ID'),
      description: tool.schema.string()
        .optional()
        .describe('File description'),
      folder: tool.schema.string()
        .optional()
        .describe('Folder path within sprint for S3 organization (e.g., "project", "docs", "meetings")'),
      storyId: tool.schema.number()
        .optional()
        .describe('Link file to a story (e.g., doc_folder story for logical grouping)'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error ?? '❌ No API token configured.';
      }
      client.setToken?.(tokenResult.token);

      try {
        // Check if file exists
        if (!fs.existsSync(args.filePath)) {
          return `❌ File not found: ${args.filePath}`;
        }

        // Read file
        const fileContent = fs.readFileSync(args.filePath);
        const fileName = path.basename(args.filePath);
        const ext = path.extname(fileName);
        const fileSize = fileContent.length;

        const contentType = contentTypeFromExtension(ext);

        // Get presigned URL
        const presign = await client.createPresignedUpload({
          sprintId: args.sprintId,
          contentType,
          originalName: fileName,
          folder: args.folder,
        });

        const uploadResponse = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(fileSize),
          },
          body: fileContent,
        });
        if (!uploadResponse.ok) {
          const text = await uploadResponse.text().catch(() => '');
          return `❌ Upload failed (${uploadResponse.status}): ${text || uploadResponse.statusText}`;
        }

        // Complete upload
        const complete = await client.completeUpload({
          sprintId: args.sprintId,
          fileName: presign.fileName,
          originalName: fileName,
          fileType: contentType,
          size: fileSize,
          x: 0,
          y: 0,
          folder: args.folder,
          storyId: args.storyId,
        });

        return [
          `✅ File uploaded successfully!`,
          '',
          `**File**: ${fileName}`,
          `**Size**: ${formatFileSize(fileSize)}`,
          `**URL**: ${complete.url}`,
          args.description ? `**Description**: ${args.description}` : null,
          args.folder ? `**Folder**: ${args.folder}` : null,
          args.storyId ? `**Linked to Story**: #${args.storyId}` : null,
        ].filter(Boolean).join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createFileListTool(client: ForLoopAPIClient) {
  return tool({
    description: 'List files attached to a sprint',
    args: {
      sprintId: tool.schema.number()
        .describe('Sprint ID to list files from'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error ?? '❌ No API token configured.';
      }
      client.setToken?.(tokenResult.token);

      try {
        const files = await client.getSprintFiles(args.sprintId);
        
        if (files.length === 0) {
          return '🗂️ No files found in this sprint.';
        }

        const lines: string[] = [`🗂️ Files in Sprint #${args.sprintId}:`, ''];

        for (const file of files) {
          const size = formatFileSize(file.size);
          const uploadedBy = file.uploader?.name || file.uploaderId ? `by ${file.uploader?.name || `User #${file.uploaderId}`}` : '';
          const date = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '';
          
          lines.push(`📎 **${file.originalName || file.filename}**`);
          lines.push(`   Size: ${size} | Type: ${file.fileType}`);
          lines.push(`   Uploaded: ${date} ${uploadedBy}`);
          lines.push(`   URL: ${file.url}`);
          lines.push('');
        }

        return lines.join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createFileDeleteTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Delete a file from a sprint (permanent action)',
    args: {
      fileId: tool.schema.number()
        .describe('File ID to delete'),
      confirm: tool.schema.boolean()
        .default(false)
        .describe('Confirm deletion'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error ?? '❌ No API token configured.';
      }
      client.setToken?.(tokenResult.token);

      if (!args.confirm) {
        return [
          '⚠️ **Warning**: This action is permanent and cannot be undone!',
          '',
          'Use `--confirm true` to proceed with deletion.',
        ].join('\n');
      }

      try {
        await client.deleteFile(args.fileId);

        return `✅ File #${args.fileId} deleted successfully.`;
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}

export function createFileDownloadUrlTool(client: ForLoopAPIClient) {
  return tool({
    description: 'Get a download URL for a file',
    args: {
      fileId: tool.schema.number()
        .describe('File ID to download'),
    },
    async execute(args, _context) {
      const tokenResult = await validateToken();
      if (!tokenResult.valid) {
        return tokenResult.error ?? '❌ No API token configured.';
      }
      client.setToken?.(tokenResult.token);

      try {
        // Log file read (tracks access)
        await client.logFileRead(args.fileId);

        // Get download URL
        const download = await client.getFileDownloadUrl(args.fileId);

        return [
          `📥 Download URL`,
          '',
          `**File ID**: ${args.fileId}`,
          `**URL**: ${download.url}`,
          '',
          '⚠️ This URL may expire. Download the file soon.',
        ].join('\n');
      } catch (error: any) {
        return `❌ Error: ${error.message}`;
      }
    },
  });
}
