import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// The dependency rule: inner layers never import outer layers or framework packages.
// These tests pin the oxlint configuration that enforces it. Each case lints a sample
// file inside a temporary copy of the project layout, using the real .oxlintrc.json.

const projectRoot = resolve(import.meta.dirname, '../..');
const oxlint = join(projectRoot, 'node_modules/.bin/oxlint');

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'layer-boundaries-'));
  copyFileSync(
    join(projectRoot, '.oxlintrc.json'),
    join(workspace, '.oxlintrc.json'),
  );
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function restrictedImportErrors(layerFile: string, importPath: string): number {
  const file = join(workspace, layerFile);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `import { something } from '${importPath}';\nexport const sample = something;\n`,
  );

  let output: string;
  try {
    output = execFileSync(oxlint, ['--format', 'json', layerFile], {
      cwd: workspace,
      encoding: 'utf8',
    });
  } catch (error) {
    // oxlint exits with a non-zero code when it reports errors.
    output = (error as { stdout: string }).stdout;
  }

  const report = JSON.parse(output) as { diagnostics: { code: string }[] };
  return report.diagnostics.filter((diagnostic) =>
    diagnostic.code.includes('no-restricted-imports'),
  ).length;
}

describe('layer boundaries', () => {
  it.each([
    ['src/domain/level/sample.ts', '../../application/use-case.js'],
    ['src/domain/level/sample.ts', '../../adapters/http/controller.js'],
    ['src/domain/level/sample.ts', '../../infrastructure/app.module.js'],
    ['src/domain/level/sample.ts', '@nestjs/common'],
    ['src/domain/level/sample.ts', 'express'],
    ['src/application/sample.ts', '../adapters/http/controller.js'],
    ['src/application/sample.ts', '../infrastructure/app.module.js'],
    ['src/application/sample.ts', '@nestjs/common'],
    ['src/application/sample.ts', 'express'],
    ['src/adapters/sample.ts', '../infrastructure/app.module.js'],
  ])('should_report_error_when_%s_imports_%s', (layerFile, importPath) => {
    // Arrange: the layer file and the forbidden import come from the table.

    // Act
    const errors = restrictedImportErrors(layerFile, importPath);

    // Assert
    expect(errors).toBe(1);
  });

  it.each([
    ['src/application/sample.ts', '../domain/level.js'],
    ['src/adapters/sample.ts', '../application/use-case.js'],
    ['src/adapters/sample.ts', '@nestjs/common'],
    ['src/infrastructure/sample.ts', '../adapters/http/controller.js'],
    ['src/infrastructure/sample.ts', '@nestjs/core'],
  ])(
    'should_allow_import_when_%s_imports_inner_or_allowed_%s',
    (layerFile, importPath) => {
      // Arrange: the layer file and the allowed import come from the table.

      // Act
      const errors = restrictedImportErrors(layerFile, importPath);

      // Assert
      expect(errors).toBe(0);
    },
  );
});
