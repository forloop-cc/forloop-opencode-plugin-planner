const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
};

export function contentTypeFromExtension(ext: string): string {
  const base = MIME_TYPES[String(ext || '').toLowerCase()] || 'application/octet-stream';
  // Text payloads are always UTF-8; without an explicit charset browsers fall
  // back to Latin-1 and render multi-byte characters as mojibake.
  return base.startsWith('text/') && !/charset/i.test(base) ? `${base}; charset=utf-8` : base;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
