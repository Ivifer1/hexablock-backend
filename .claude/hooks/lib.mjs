// Shared helpers for the HexaBlock Claude Code hooks.
// Plain Node (no dependencies) so the hooks run the same on macOS, Linux and Windows.
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, resolve, dirname, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';

export const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

export function readInput() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadConfig() {
  const file = join(projectDir, '.claude', 'harness.config.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function run(cmd, args, { cwd = projectDir, timeout = 300_000 } = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    shell: process.platform === 'win32',
    env: process.env,
  });
  return {
    code: result.status ?? 1,
    out: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  };
}

export function git(args, cwd = projectDir) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout ?? '').trim() : '';
}

export const currentBranch = (cwd = projectDir) => git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);

/** Repo-relative POSIX path, or null when the file is outside the project. */
export function repoPath(file) {
  if (!file) return null;
  const abs = isAbsolute(file) ? file : resolve(projectDir, file);
  const rel = relative(projectDir, abs).split('\\').join('/');
  return rel.startsWith('..') ? null : rel;
}

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export const matchesAny = (path, globs = []) => !!path && globs.some((g) => globToRegExp(g).test(path));

export function changeRecordPath(branch, cfg) {
  const safe = branch.replace(/[^A-Za-z0-9._-]+/g, '__');
  return join(projectDir, cfg.changeRecordsDir, `${safe}.md`);
}

export const readText = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);
export const mtime = (file) => (existsSync(file) ? statSync(file).mtimeMs : 0);

export const APPROVED_RE = /^\s*\**Status\**\s*:\s*\**APPROVED\b/im;

// ---- Hook outputs -------------------------------------------------------

export function denyTool(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}

export function askHuman(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
}

/** Exit 2: the action is blocked (or, on Stop, Claude keeps working) and stderr goes to Claude. */
export function feedBackToClaude(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

// ---- Per-session state (which files this turn touched, stop attempts) ----

function stateFile(sessionId) {
  const dir = join(tmpdir(), 'hexablock-harness');
  mkdirSync(dir, { recursive: true });
  return join(dir, `${String(sessionId || 'no-session').replace(/[^A-Za-z0-9_-]/g, '')}.json`);
}

export function loadState(sessionId) {
  try {
    return JSON.parse(readFileSync(stateFile(sessionId), 'utf8'));
  } catch {
    return { touched: [], stopBlocks: 0 };
  }
}

export function saveState(sessionId, state) {
  writeFileSync(stateFile(sessionId), JSON.stringify(state));
}

export const tail = (text, max = 3500) => (text.length > max ? `…${text.slice(-max)}` : text);
export { dirname };
