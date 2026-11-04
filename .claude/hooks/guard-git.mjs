// PreToolUse(Bash): enforces the team's Git rules before any git command runs.
// - no commits or pushes on protected branches, no force push, no --no-verify
// - Conventional Commits, in English
// - the right GitHub identity for THIS repo (multi-account setups)
// - the change record travels with every commit that touches gated code
// - agents never rewrite git identity or global config
import {
  readInput, loadConfig, git, currentBranch, changeRecordPath, repoPath, matchesAny, denyTool, askHuman, projectDir,
} from './lib.mjs';

const input = readInput();
const cmd = String(input.tool_input?.command ?? '');
if (!/\bgit\b|\bgh\b/.test(cmd)) process.exit(0);

const cfg = loadConfig();
const cwd = input.cwd || projectDir;
const branch = currentBranch(cwd);
const protectedBranches = cfg.git.protectedBranches;
const problems = [];

const has = (re) => re.test(cmd);
const isCommit = has(/(^|[;&|(\n]\s*)(\w+=\S*\s+)*git(\s+-c\s+\S+)*\s+commit\b/);
const isPush = has(/(^|[;&|(\n]\s*)(\w+=\S*\s+)*git(\s+-c\s+\S+)*\s+push\b/);

// 1. Agents never change identity or global configuration.
if (has(/git\s+config\b[^\n;&|]*(--global|--system|user\.(name|email)|core\.sshCommand|credential\.)/)) {
  denyTool(
    'Git identity and global configuration are owned by the human. Do not run `git config` for user.*, core.sshCommand, credentials or --global. ' +
      'If the identity is wrong, stop and tell the human (see .claude/settings.local.json).',
  );
}

// 2. Destructive operations need a human.
if (has(/git\s+(reset\s+--hard|clean\s+-\w*f|checkout\s+--\s|restore\s+(?!--staged)|branch\s+-D|rebase\b|filter-branch|stash\s+(drop|clear))/)) {
  askHuman('Destructive Git operation: it can discard work. A human must confirm it.');
}

// 3. Identity check for this repo (set per person in .claude/settings.local.json -> env).
function identityProblems() {
  const out = [];
  const expectedEmail = process.env.HEXABLOCK_GIT_EMAIL;
  const actualEmail = git(['config', 'user.email'], cwd);
  if (expectedEmail && actualEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
    out.push(
      `Git identity mismatch: this repo expects ${expectedEmail} but git would use "${actualEmail || '(none)'}". ` +
        'Fix your includeIf/gitconfig setup (see CUENTAS_GITHUB.md); do not change it from the agent.',
    );
  }
  const expectedRemote = process.env.HEXABLOCK_GIT_REMOTE_MATCH;
  const remote = git(['remote', 'get-url', 'origin'], cwd);
  if (expectedRemote && remote && !remote.includes(expectedRemote)) {
    out.push(`Remote "origin" is ${remote}; it should contain "${expectedRemote}" so the right SSH key/account is used.`);
  }
  return out;
}

// 4. Commit rules.
function extractCommitSubject() {
  const heredoc = cmd.match(/<<-?\s*['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\s*\1\b/);
  if (heredoc && /commit\b/.test(cmd)) return heredoc[2].split('\n').find((l) => l.trim())?.trim() ?? null;
  const m = cmd.match(/(?:\s-m|\s--message)(?:\s+|=)(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/);
  if (!m) return null;
  return (m[1] ?? m[2] ?? '').split('\n')[0].trim();
}

if (isCommit) {
  if (protectedBranches.includes(branch)) {
    problems.push(`You are on "${branch}". Never commit to a protected branch: create one first (git switch -c feat/<scope>-<short-name>).`);
  }
  if (has(/--no-verify\b|\scommit\b[^\n]*\s-n(\s|$)/)) problems.push('Do not bypass git hooks (--no-verify / -n).');

  const subject = extractCommitSubject();
  if (subject !== null) {
    const types = cfg.git.commitTypes.join('|');
    const conventional = new RegExp(`^(${types})(\\([a-z0-9][a-z0-9-]*\\))?!?: [a-z0-9].{0,${cfg.git.maxSubjectLength - 1}}$`);
    if (!conventional.test(subject)) {
      problems.push(
        `Commit subject "${subject}" is not a valid Conventional Commit. Use type(scope): imperative summary in lowercase English, ` +
          `<= ${cfg.git.maxSubjectLength} chars. Types: ${cfg.git.commitTypes.join(', ')}. Suggested scopes: ${cfg.git.scopes.join(', ')}.`,
      );
    }
    if (/[áéíóúñ¿¡ü]/i.test(subject)) problems.push('Commit messages must be written in English.');
  }

  // The change record must exist and be committed together with gated code.
  const changed = git(['status', '--porcelain'], cwd)
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).split(' -> ').pop());
  const touchesGated = changed.some((p) => matchesAny(p, cfg.gatedPaths));
  if (touchesGated && !protectedBranches.includes(branch)) {
    const record = changeRecordPath(branch, cfg);
    const recordRel = repoPath(record);
    if (!changed.includes(recordRel) && !git(['ls-files', recordRel], cwd)) {
      problems.push(`This commit touches gated code but ${recordRel} does not exist. Write the change record first (template in ${cfg.changeRecordsDir}/TEMPLATE.md).`);
    } else if (changed.includes(recordRel) && !/git\s+add\b/.test(cmd) && !/\s-a\b|--all\b/.test(cmd)) {
      const staged = git(['diff', '--cached', '--name-only'], cwd).split('\n');
      if (!staged.includes(recordRel)) problems.push(`Stage the updated change record too: git add ${recordRel}`);
    }
  }
  problems.push(...identityProblems());
}

// 5. Push rules.
if (isPush) {
  if (has(/--force(?!-with-lease)\b|\spush\b[^\n]*\s-f(\s|$)/)) problems.push('Force push is not allowed. Use --force-with-lease only on your own feature branch, and ask first.');
  if (has(/--no-verify\b/)) problems.push('Do not bypass git hooks (--no-verify).');
  const target = protectedBranches.find((b) => new RegExp(`(\\s|:)${b}(\\s|$)`).test(cmd));
  if (target || (protectedBranches.includes(branch) && !/\spush\s+\S+\s+\S+/.test(cmd))) {
    problems.push(`Never push to "${target || branch}". Push your feature branch and open a pull request.`);
  }
  problems.push(...identityProblems());
}

// 6. Merging PRs is a human decision.
if (has(/\bgh\s+pr\s+merge\b/)) askHuman('Merging a pull request is a human decision after review and green CI.');

if (problems.length) {
  denyTool(`Blocked by the team's Git rules:\n- ${problems.join('\n- ')}`);
}
process.exit(0);
