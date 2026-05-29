#!/usr/bin/env node
/**
 * ForLoop Token Migration Script
 * 
 * Migrates tokens from old location (~/.config/opencode/tokens.json)
 * to new location (~/.config/forloop/tokens.json)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OLD_TOKEN_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.config',
  'opencode',
  'tokens.json'
);

const NEW_TOKEN_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.config',
  'forloop',
  'tokens.json'
);

async function migrate() {
  console.log('🔄 ForLoop Token Migration');
  console.log('=========================\n');
  
  // Check if old file exists
  try {
    await fs.access(OLD_TOKEN_PATH);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('✅ No old token file found - nothing to migrate');
      console.log(`\nTokens will be stored at: ${NEW_TOKEN_PATH}`);
      return;
    }
    throw error;
  }
  
  console.log(`📂 Old location: ${OLD_TOKEN_PATH}`);
  console.log(`📂 New location: ${NEW_TOKEN_PATH}`);
  console.log('');
  
  // Read old tokens
  const content = await fs.readFile(OLD_TOKEN_PATH, 'utf-8');
  const oldTokens = JSON.parse(content);
  
  // Create new token structure
  const newTokens = {
    version: '1.0',
    note: 'ForLoop API tokens - do not share',
    default: oldTokens.default,
    profiles: oldTokens.profiles || {},
    lastUpdated: oldTokens.lastUpdated || new Date().toISOString(),
  };
  
  // Create new directory
  const newDir = path.dirname(NEW_TOKEN_PATH);
  await fs.mkdir(newDir, { recursive: true });
  
  // Write new file with secure permissions
  await fs.writeFile(NEW_TOKEN_PATH, JSON.stringify(newTokens, null, 2), {
    mode: 0o600, // Owner read/write only
  });
  
  console.log('✅ Migration successful!');
  console.log('');
  console.log('📊 Migrated:');
  if (newTokens.default) {
    const masked = newTokens.default.slice(0, 10) + '...';
    console.log(`   - Default token: ${masked}`);
  }
  if (newTokens.profiles && Object.keys(newTokens.profiles).length > 0) {
    console.log(`   - Profiles: ${Object.keys(newTokens.profiles).join(', ')}`);
  }
  console.log('');
  console.log('📝 You can safely delete the old file:');
  console.log(`   rm ${OLD_TOKEN_PATH}`);
  console.log('');
}

migrate().catch(error => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});
