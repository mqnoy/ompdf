#!/usr/bin/env node
'use strict';

const { promises: fs } = require('node:fs');
const path = require('node:path');
const {
  compressPdf,
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
} = require('ompdf');

/**
 * Convert bytes to a compact human-readable size.
 *
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/**
 * Print command usage details.
 *
 * @param {string} scriptName
 */
function printUsage(scriptName) {
  console.log(`Usage:
  node ${scriptName} <input.pdf> [output.pdf] [algorithm] [quality]

Arguments:
  input.pdf   Path to the source PDF. Required.
  output.pdf  Path for the compressed PDF. Default: <input-name>.compressed.pdf
  algorithm   standard | condense | mutool | ghostscript | smallest | photon
              Default: standard
  quality     low | medium | high | maximum
              Default: medium

Examples:
  node ${scriptName} ./document.pdf
  node ${scriptName} ./document.pdf ./document-compressed.pdf
  node ${scriptName} ./document.pdf ./document-smallest.pdf smallest high
`);
}

/**
 * Resolve CLI options for the example.
 *
 * @returns {{ inputPath: string, outputPath: string, algorithm: string, quality: string }}
 */
function parseArgs() {
  const [, scriptPath, ...rawArgs] = process.argv;
  const args = rawArgs.filter((arg) => arg !== '--');
  const [inputPath, outputPathArg, algorithmArg, qualityArg] = args;

  if (!inputPath || inputPath === '--help' || inputPath === '-h') {
    printUsage(path.basename(scriptPath || 'commonjs-usage.cjs'));
    process.exit(inputPath ? 0 : 1);
  }

  const parsedInput = path.parse(inputPath);
  const outputPath = outputPathArg || path.join(
    parsedInput.dir,
    `${parsedInput.name}.compressed${parsedInput.ext || '.pdf'}`,
  );

  return {
    inputPath,
    outputPath,
    algorithm: algorithmArg || PdfCompressionAlgorithm.Standard,
    quality: qualityArg || PdfCompressionQuality.Medium,
  };
}

/**
 * Read a PDF from disk, compress it with ompdf, and write the result.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const { inputPath, outputPath, algorithm, quality } = parseArgs();

  const input = await fs.readFile(inputPath);
  const result = await compressPdf(input, {
    filename: path.basename(inputPath),
    algorithm,
    quality,
    removeMetadata: true,
    optimizeImages: true,
  });

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(outputPath, result.data);

  console.log('PDF compressed successfully');
  console.log(`Input:      ${inputPath}`);
  console.log(`Output:     ${outputPath}`);
  console.log(`Algorithm:  ${result.stats.algorithm}`);
  console.log(`Quality:    ${result.stats.quality || quality}`);
  console.log(`Original:   ${formatBytes(result.stats.originalSize)}`);
  console.log(`Compressed: ${formatBytes(result.stats.compressedSize)}`);
  console.log(`Reduction:  ${result.stats.compressionRatio}`);
  console.log(`Time:       ${result.stats.processingTimeMs} ms`);
}

main().catch((error) => {
  console.error('Failed to compress PDF');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
