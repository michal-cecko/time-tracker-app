import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { execSync } from 'node:child_process';
import path from 'node:path';

// Auto-versioning straight off git so every build carries an identifier we
// can show in Settings → About and (later) report alongside crash logs.
//
//   APP_VERSION       — short SHA (or "dev")
//   APP_BUILD_NUMBER  — total commit count on the current branch (monotonic)
//   APP_BUILD_TIME    — ISO timestamp of the build
//
// Pinned at build time via `define:` so it lands in the production bundle.
// Reading them at runtime: import.meta.env.VITE_APP_VERSION, etc. — or use
// the `__APP_VERSION__` global that gets defined below.

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

const sha       = git('rev-parse --short HEAD') || 'dev';
const count     = git('rev-list --count HEAD')   || '0';
const dirty     = git('status --porcelain')      ? '+' : '';
const version   = `0.${count}.0${dirty}-${sha}`;
const buildTime = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__:    JSON.stringify(version),
    __APP_BUILD_NUMBER__: JSON.stringify(count),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __APP_GIT_SHA__:    JSON.stringify(sha),
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
