// PostToolUse(Write|Edit|MultiEdit): lint the file that was just changed and
// remember it, so the Stop gate knows this turn changed code.
// Exit 2 shows the lint errors to Claude so it fixes them right away.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  readInput, loadConfig, repoPath, matchesAny, run, loadState, saveState, feedBackToClaude, tail, projectDir,
} from './lib.mjs';

const input = readInput();
const rel = repoPath(input.tool_input?.file_path);
if (!rel) process.exit(0);

const cfg = loadConfig();

if (matchesAny(rel, [...cfg.gatedPaths, ...cfg.testPaths])) {
  const state = loadState(input.session_id);
  if (!state.touched.includes(rel)) state.touched.push(rel);
  saveState(input.session_id, state);
}

const lintable = /\.(m|c)?(t|j)sx?$/.test(rel) && matchesAny(rel, cfg.lint.paths);
if (!lintable || !existsSync(join(projectDir, 'node_modules'))) process.exit(0);

const [cmd, ...args] = cfg.lint.command;
const result = run(cmd, [...args, rel], { timeout: 120_000 });
if (result.code !== 0) {
  feedBackToClaude(`Lint failed for ${rel}. Fix it before continuing (do not disable rules):\n${tail(result.out)}`);
}
process.exit(0);
