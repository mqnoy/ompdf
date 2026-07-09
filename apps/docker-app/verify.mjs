import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';

const forbiddenExecutables = ['gs', 'mutool', 'python', 'python3', 'convert'];
const processMethods = [
  'exec',
  'execFile',
  'execFileSync',
  'execSync',
  'fork',
  'spawn',
  'spawnSync',
];

async function executableExists(name) {
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!directory) continue;
    try {
      await fs.access(path.join(directory, name), fsConstants.X_OK);
      return true;
    } catch {
      // Keep searching PATH.
    }
  }
  return false;
}

for (const executable of forbiddenExecutables) {
  assert.equal(
    await executableExists(executable),
    false,
    `Unexpected system executable found in PATH: ${executable}`,
  );
}
console.log(`✓ system PDF tools are absent (${forbiddenExecutables.join(', ')})`);

for (const method of processMethods) {
  childProcess[method] = () => {
    throw new Error(`ompdf attempted forbidden child_process.${method}()`);
  };
}
syncBuiltinESMExports();

const { compressPdf } = await import('ompdf');
const input = await fs.readFile(new URL('./fixtures/sample.pdf', import.meta.url));
const algorithms = ['standard', 'condense', 'mutool', 'ghostscript'];

for (const algorithm of algorithms) {
  const result = await compressPdf(input, {
    algorithm,
    filename: 'sample.pdf',
    photon: { dpi: 72, quality: 60 },
  });

  assert.ok(result.data.length > 5, `${algorithm}: output is empty`);
  assert.equal(
    result.data.subarray(0, 5).toString('ascii'),
    '%PDF-',
    `${algorithm}: output does not have a PDF signature`,
  );
  assert.equal(
    result.stats.algorithm,
    algorithm,
    `${algorithm}: package reported a different algorithm`,
  );
  assert.equal(result.stats.originalSize, input.length, `${algorithm}: original size mismatch`);
  assert.equal(result.stats.compressedSize, result.data.length, `${algorithm}: output size mismatch`);
  assert.ok(result.stats.pagesProcessed > 0, `${algorithm}: no pages were processed`);
  assert.ok(result.stats.processingTimeMs >= 0, `${algorithm}: invalid processing time`);

  console.log(
    `✓ ${algorithm}: ${result.stats.originalSize} -> ${result.stats.compressedSize} bytes ` +
      `(${result.stats.pagesProcessed} page(s))`,
  );
}

console.log('✓ ompdf ran from its packed public API without system PDF executables');
