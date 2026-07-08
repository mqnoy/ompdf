import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(packageDir, 'src', 'pkgs', 'pymupdf-wasm');
const targetDir = path.join(packageDir, 'dist', 'pkgs', 'pymupdf-wasm');

const runtimeAssetExtensions = new Set([
  '.js',
  '.json',
  '.wasm',
  '.whl',
  '.zip',
]);

await mkdir(targetDir, { recursive: true });

const sourceAssets = (await readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .filter((entry) => runtimeAssetExtensions.has(path.extname(entry.name)))
  .map((entry) => entry.name);

await Promise.all(sourceAssets.map((assetName) => rm(path.join(targetDir, assetName), { force: true })));
await Promise.all(sourceAssets.map((assetName) => cp(path.join(sourceDir, assetName), path.join(targetDir, assetName))));
