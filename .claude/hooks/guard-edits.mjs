// PreToolUse(Write|Edit|MultiEdit): checks a file change BEFORE it is written.
// 1. Guardrail files (hooks, settings, lint rules, architecture tests, CI) need a human.
// 2. Only a human may approve a design proposal (Status: APPROVED in a change record).
// 3. Gated code (src/**) is only edited on a feature branch, after the proposal is APPROVED.
// 4. Inner layers stay pure: no outer-layer imports, no framework packages, no direct
//    infrastructure (randomness, clock, console, network, storage, env).
// 5. The generic engine core has no conditionals on the concrete variant (LSP/OCP).
import { posix } from 'node:path';
import {
  readInput, loadConfig, currentBranch, changeRecordPath, repoPath, matchesAny, readText, denyTool, askHuman,
  APPROVED_RE, projectDir,
} from './lib.mjs';

const input = readInput();
const ti = input.tool_input ?? {};
const rel = repoPath(ti.file_path || ti.notebook_path);
if (!rel) process.exit(0);

const cfg = loadConfig();
const branch = currentBranch(input.cwd || projectDir);

const newText = [ti.content, ti.new_string, ...(ti.edits ?? []).map((e) => e.new_string)].filter(Boolean).join('\n');
const oldText = [ti.old_string, ...(ti.edits ?? []).map((e) => e.old_string)].filter(Boolean).join('\n');

// 2. Approval is a human act.
if (rel.startsWith(`${cfg.changeRecordsDir}/`) && APPROVED_RE.test(newText)) {
  const current = readText(`${projectDir}/${rel}`) ?? '';
  const alreadyApproved = ti.content !== undefined ? APPROVED_RE.test(current) : APPROVED_RE.test(oldText);
  if (!alreadyApproved) {
    denyTool(
      'Only a human can approve a design proposal. Keep "Status: PROPOSED", present the proposal to the team in Spanish ' +
        'and wait: a person edits the line to "Status: APPROVED" in their editor.',
    );
  }
}

// 1. Guardrails need a human.
if (matchesAny(rel, cfg.protectedPaths)) {
  askHuman(`${rel} is part of the team's guardrails (harness, lint rules, architecture tests or CI). A human must confirm this change.`);
}

const gated = matchesAny(rel, cfg.gatedPaths);

// 3. Branch and approval gate.
if (gated) {
  if (cfg.git.protectedBranches.includes(branch)) {
    denyTool(`You are on "${branch}". Create a feature branch before touching ${rel}: git switch -c feat/<scope>-<short-name>.`);
  }
  if (cfg.requireApprovedProposal) {
    const record = changeRecordPath(branch, cfg);
    const recordRel = repoPath(record);
    const text = readText(record);
    if (text === null) {
      denyTool(
        `No design proposal for branch "${branch}". Before editing ${rel}: copy ${cfg.changeRecordsDir}/TEMPLATE.md to ${recordRel}, ` +
          'fill the proposal sections (spec, layers, ports, SOLID, patterns, alternatives), set "Status: PROPOSED", explain it to the team in Spanish and wait for approval.',
      );
    }
    if (!APPROVED_RE.test(text)) {
      denyTool(`The proposal in ${recordRel} is not approved yet. Ask the team to review it; a human sets "Status: APPROVED". Tests under test/ can be written meanwhile.`);
    }
  }
}

// 4. Layer purity.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const code = stripComments(newText);
const violations = [];

const layerOf = (path) => cfg.layers.find((l) => matchesAny(path, l.paths));
const fileLayer = layerOf(rel);

if (fileLayer && /\.(m|c)?(t|j)sx?$/.test(rel)) {
  const specRe = /(?:\bimport\s[^'";]*?\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bexport\s[^'";]*?\bfrom\s*|\bimport\s+)['"]([^'"]+)['"]/g;
  for (const [, spec] of code.matchAll(specRe)) {
    if (spec.startsWith('.')) {
      const target = posix.normalize(posix.join(posix.dirname(rel), spec));
      const targetLayer = layerOf(`${target}.ts`) || layerOf(`${target}/index.ts`) || layerOf(target);
      if (targetLayer && fileLayer.forbiddenLayers.includes(targetLayer.name)) {
        violations.push(`imports "${spec}" from the outer "${targetLayer.name}" layer. Dependencies point inwards only: depend on a port declared in an inner layer.`);
      }
      continue;
    }
    for (const layerName of fileLayer.forbiddenLayers) {
      if (new RegExp(`(^|/)${layerName}(/|$)`).test(spec)) violations.push(`imports "${spec}" from the outer "${layerName}" layer.`);
    }
    const pkgHit = fileLayer.forbiddenPackages.find((p) => (p.endsWith('*') ? spec.startsWith(p.slice(0, -1)) : spec === p || spec.startsWith(`${p}/`)));
    if (pkgHit) violations.push(`imports the framework/infrastructure package "${spec}". This layer must not know it exists: define a port here and implement it in an outer layer.`);
  }
  for (const api of fileLayer.forbiddenApis) {
    if (new RegExp(api.pattern).test(code)) violations.push(`${api.message}`);
  }
}

// 5. The generic engine never branches on the concrete variant.
if (matchesAny(rel, cfg.engineCorePaths) && /\b(variant|gameId|game_id|gameType)\b\s*(===|!==|==|!=)|\bcase\s+['"`]hexa|\binstanceof\s+Hexa\w+/i.test(code)) {
  violations.push(
    'the generic engine branches on a concrete variant. That breaks LSP and OCP: move the behaviour behind IGameRules / a Strategy and let the variant factory choose it.',
  );
}

if (violations.length) {
  denyTool(
    `Clean Architecture violation in ${rel} (${fileLayer?.name ?? 'engine'} layer):\n- ${violations.join('\n- ')}\n` +
      'See .claude/rules/ for the layer rules. If you believe the rule is wrong, stop and discuss it with the team in an ADR.',
  );
}
process.exit(0);
