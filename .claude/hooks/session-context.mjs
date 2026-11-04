// SessionStart: plain-text stdout is added to Claude's context.
// Tells the agent where it is (branch, identity, proposal status) and what it must not forget.
import { readInput, loadConfig, git, currentBranch, changeRecordPath, repoPath, readText, APPROVED_RE, projectDir } from './lib.mjs';

const input = readInput();
const cfg = loadConfig();
const cwd = input.cwd || projectDir;
const branch = currentBranch(cwd) || '(unknown)';
const email = git(['config', 'user.email'], cwd) || '(not set)';
const remote = git(['remote', 'get-url', 'origin'], cwd) || '(no origin)';
const expected = process.env.HEXABLOCK_GIT_EMAIL;
const record = changeRecordPath(branch, cfg);
const text = readText(record);
const status = text === null ? 'none yet' : APPROVED_RE.test(text) ? 'APPROVED' : 'PROPOSED (waiting for a human)';

const lines = [
  `Project: ${cfg.projectName}. Branch: ${branch}. Git identity: ${email}. Remote: ${remote}.`,
  `Change record for this branch: ${repoPath(record)} -> ${status}.`,
];
if (expected && expected.toLowerCase() !== email.toLowerCase()) {
  lines.push(`WARNING: this repo expects the identity ${expected}. Tell the human before any commit; do not fix it yourself.`);
}
if (cfg.git.protectedBranches.includes(branch)) {
  lines.push('You are on a protected branch: create a feature branch before changing code.');
}
lines.push(
  'Non-negotiable: spec first, human-approved design proposal before src/ changes, one generic engine (no per-variant conditionals), ' +
    'dependencies point inwards, SOLID and GoF patterns justified in the change record, tests AAA named should_x_when_y, ' +
    'Conventional Commits in English, explain every change to the team in Spanish.',
);
process.stdout.write(lines.join('\n'));
