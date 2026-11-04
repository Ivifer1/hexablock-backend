// Stop: when this turn changed code or tests, Claude cannot finish until
//   1. the change record for the branch is up to date,
//   2. typecheck / lint / tests are green,
//   3. the final message explains the change to the humans.
// Exit 2 sends Claude back to work with the list of what is missing.
// After `maxBlocks` attempts it lets the turn end and warns the human instead,
// so a broken environment can never trap the session in a loop.
import {
  readInput, loadConfig, currentBranch, changeRecordPath, repoPath, readText, mtime, run, loadState, saveState,
  feedBackToClaude, tail, projectDir,
} from './lib.mjs';
import { join } from 'node:path';

const input = readInput();
const cfg = loadConfig();
const state = loadState(input.session_id);
if (!state.touched.length) process.exit(0);

const problems = [];
const branch = currentBranch(input.cwd || projectDir);
const record = changeRecordPath(branch, cfg);
const recordRel = repoPath(record);
const recordText = readText(record);

const touchedCode = state.touched.filter((p) => !p.startsWith('test/') && !/\.(test|spec|e2e-spec)\.[tj]sx?$/.test(p));
if (touchedCode.length) {
  if (recordText === null) {
    problems.push(`Write the change record ${recordRel} (template: ${cfg.changeRecordsDir}/TEMPLATE.md).`);
  } else {
    const newest = Math.max(...touchedCode.map((p) => mtime(join(projectDir, p))));
    if (mtime(record) < newest) {
      problems.push(`Update ${recordRel}: the "Implementation notes", "Verification" and "AI usage" sections must describe what you changed in this turn.`);
    }
    for (const heading of cfg.changeRecordRequiredSections) {
      const section = recordText.split(/^## /m).find((s) => s.startsWith(heading));
      if (!section || /TODO|<fill|_\(pending\)_/i.test(section)) problems.push(`Complete the "${heading}" section of ${recordRel}.`);
    }
  }
}

for (const check of cfg.stop.commands) {
  const [cmd, ...args] = check;
  const result = run(cmd, args, { timeout: 600_000 });
  if (result.code !== 0) problems.push(`\`${check.join(' ')}\` failed:\n${tail(result.out, 2500)}`);
}

const last = String(input.last_assistant_message ?? '');
if (touchedCode.length && last && !cfg.stop.explanationMarkers.some((m) => last.includes(m))) {
  problems.push(
    `End your reply with the human explanation, in Spanish, under the heading "${cfg.stop.explanationMarkers[0]}": ` +
      'what changed and why, the Clean Architecture layer of each file, the SOLID principles applied, the patterns used and why, the tests that prove it, and the trade-offs.',
  );
}

if (problems.length && state.stopBlocks < cfg.stop.maxBlocks) {
  state.stopBlocks += 1;
  saveState(input.session_id, state);
  feedBackToClaude(`Not done yet (definition of done, attempt ${state.stopBlocks}/${cfg.stop.maxBlocks}):\n- ${problems.join('\n- ')}`);
}

saveState(input.session_id, { touched: [], stopBlocks: 0 });
if (problems.length) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `HexaBlock harness: the turn ended with open issues after ${cfg.stop.maxBlocks} attempts. Review before committing:\n- ${problems.map((p) => p.split('\n')[0]).join('\n- ')}`,
    }),
  );
}
process.exit(0);
