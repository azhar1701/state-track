#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(file) {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
}

function hasVar(text, key) {
  const re = new RegExp(`^\n?\s*${key}\s*=`, 'm');
  return re.test(text);
}

const root = process.cwd();
const envLocalPath = path.join(root, '.env.local');
const envPath = path.join(root, '.env');
const envLocalExample = path.join(root, '.env.local.example');
const envExample = path.join(root, '.env.example');

function copyIfMissing(src, dest) {
  try {
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      return true;
    }
  } catch {}
  return false;
}

const created = [];
if (copyIfMissing(envLocalExample, envLocalPath)) created.push('.env.local');
if (copyIfMissing(envExample, envPath)) created.push('.env');

const envLocal = readEnvFile(envLocalPath);
const envServer = readEnvFile(envPath);

const missingClient = [];
if (!hasVar(envLocal, 'VITE_SUPABASE_URL')) missingClient.push('VITE_SUPABASE_URL');
if (!hasVar(envLocal, 'VITE_SUPABASE_PUBLISHABLE_KEY')) missingClient.push('VITE_SUPABASE_PUBLISHABLE_KEY');

const tips = [];
if (missingClient.length > 0) {
  tips.push(
    `- Missing in .env.local: ${missingClient.join(', ')}\n  Create it by copying .env.local.example and fill your values.`
  );
}

// Optional but helpful
if (!hasVar(envLocal, 'VITE_ADMIN_EMAILS')) {
  tips.push('- Optional: add VITE_ADMIN_EMAILS to .env.local for admin allowlist fallback.');
}

// Server-side scripts env
const missingServer = [];
if (!hasVar(envServer, 'SUPABASE_URL')) missingServer.push('SUPABASE_URL');
if (!hasVar(envServer, 'SUPABASE_ANON_KEY')) missingServer.push('SUPABASE_ANON_KEY');

if (missingServer.length > 0) {
  tips.push(`- Missing in .env (for scripts): ${missingServer.join(', ')}\n  Copy .env.example to .env and fill values (do NOT commit).`);
}

if (tips.length > 0 || created.length > 0) {
  const banner = [
    '',
    '============================================================',
    ' Pre-flight environment check',
    '============================================================',
    ...(created.length > 0
      ? [`- Created missing files: ${created.join(', ')} (copied from examples)`]
      : []),
    ...tips,
    '',
    'You can run the helper to scaffold env files:',
    '  Cross-platform: npm run env:init',
    '  PowerShell     : ./scripts/setup-env.ps1',
    'Then restart: npm run dev',
    '============================================================',
    ''
  ].join('\n');
  console.warn(banner);
}

// Never block dev; only warn
process.exit(0);
