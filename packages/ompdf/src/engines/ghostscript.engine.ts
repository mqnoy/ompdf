import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import {
  CompressionQuality,
  type GhostscriptCompatibilityLevel,
  type GhostscriptOptions,
  type GhostscriptPreset,
} from '../types/compression.types';
import { logger } from '../utils/logger';

type GhostscriptModule = {
  FS: {
    writeFile(path: string, data: Uint8Array | Buffer): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  };
  callMain(args: string[]): number | undefined;
};

type GhostscriptFactory = (options: Record<string, unknown>) => Promise<GhostscriptModule>;

declare const WebAssembly: any;

const PRESET_BY_QUALITY: Record<CompressionQuality, GhostscriptPreset> = {
  [CompressionQuality.LOW]: 'screen',
  [CompressionQuality.MEDIUM]: 'ebook',
  [CompressionQuality.HIGH]: 'printer',
  [CompressionQuality.MAXIMUM]: 'prepress',
};

let factoryPromise: Promise<GhostscriptFactory> | undefined;

async function loadGhostscriptFactory(): Promise<GhostscriptFactory> {
  if (!factoryPromise) {
    factoryPromise = import('@jspawn/ghostscript-wasm').then((mod) => {
      return (mod.default ?? mod) as GhostscriptFactory;
    });
  }

  return factoryPromise;
}

function resolvePackageFile(relativePath: string): string {
  return require.resolve(`@jspawn/ghostscript-wasm/${relativePath}`);
}

async function createGhostscriptModule(): Promise<GhostscriptModule> {
  const factory = await loadGhostscriptFactory();
  const wasmBinary = fs.readFileSync(resolvePackageFile('gs.wasm'));

  return factory({
    noInitialRun: true,
    noExitRuntime: true,
    print: (text: string) => logger.debug(`[Ghostscript] ${text}`),
    printErr: (text: string) => logger.warn(`[Ghostscript] ${text}`),
    instantiateWasm(imports: Record<string, unknown>, success: (instance: { exports: Record<string, unknown> }) => void) {
      const wasmModule = new WebAssembly.Module(wasmBinary);
      const instance = new WebAssembly.Instance(wasmModule, imports);
      success(instance);
      return instance.exports;
    },
  });
}

export function ghostscriptPresetForQuality(
  quality: CompressionQuality = CompressionQuality.MEDIUM,
): GhostscriptPreset {
  return PRESET_BY_QUALITY[quality] ?? 'ebook';
}

export function buildGhostscriptArgs(
  inputPath: string,
  outputPath: string,
  options: GhostscriptOptions = {},
): string[] {
  const preset = options.preset ?? ghostscriptPresetForQuality(options.quality);
  const compatibilityLevel: GhostscriptCompatibilityLevel =
    options.compatibilityLevel ?? '1.4';
  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    '-sDEVICE=pdfwrite',
    `-dCompatibilityLevel=${compatibilityLevel}`,
    `-dPDFSETTINGS=/${preset}`,
  ];

  if (options.downsampleImages !== undefined) {
    args.push(`-dDownsampleColorImages=${options.downsampleImages ? 'true' : 'false'}`);
    args.push(`-dDownsampleGrayImages=${options.downsampleImages ? 'true' : 'false'}`);
    args.push(`-dDownsampleMonoImages=${options.downsampleImages ? 'true' : 'false'}`);
  }

  if (options.colorImageResolution !== undefined) {
    args.push(`-dColorImageResolution=${options.colorImageResolution}`);
  }
  if (options.grayImageResolution !== undefined) {
    args.push(`-dGrayImageResolution=${options.grayImageResolution}`);
  }
  if (options.monoImageResolution !== undefined) {
    args.push(`-dMonoImageResolution=${options.monoImageResolution}`);
  }

  args.push(`-sOutputFile=${outputPath}`, inputPath);
  return args;
}

export async function runGhostscriptCompression(
  inputBuffer: Buffer,
  options: GhostscriptOptions = {},
): Promise<{ output: Buffer; pagesProcessed: number }> {
  logger.info(
    `[Ghostscript] preset=${options.preset ?? ghostscriptPresetForQuality(options.quality)} ` +
      `compatibility=${options.compatibilityLevel ?? '1.4'}`,
  );

  const gs = await createGhostscriptModule();
  const inputPath = `/input-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const outputPath = `/output-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;

  try {
    gs.FS.writeFile(inputPath, inputBuffer);
    const exitCode = gs.callMain(buildGhostscriptArgs(inputPath, outputPath, options));

    if (exitCode !== undefined && exitCode !== 0) {
      throw new Error(`Ghostscript exited with code ${exitCode}`);
    }

    const output = Buffer.from(gs.FS.readFile(outputPath));
    const pdf = await PDFDocument.load(output);
    const pagesProcessed = pdf.getPageCount();

    logger.info(`[Ghostscript] Done. pages=${pagesProcessed} outputSize=${output.byteLength}`);
    return { output, pagesProcessed };
  } finally {
    for (const path of [inputPath, outputPath]) {
      try {
        gs.FS.unlink(path);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
