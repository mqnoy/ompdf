import { PDFDocument } from 'pdf-lib';
import {
  CompressionQuality,
  type CondenseOptions,
} from '../types/compression.types';

interface MutoolModule {
  Document: {
    openDocument(data: Buffer | Uint8Array, magic?: string): MutoolDocument;
  };
}

interface MutoolBuffer {
  length?: number;
  asUint8Array?: () => Uint8Array;
}

interface MutoolDocument {
  saveToBuffer(options?: string | Record<string, unknown>): MutoolBuffer | Uint8Array;
  destroy?: () => void;
}

const MIME_PDF = 'application/pdf';

let mupdfModulePromise: Promise<MutoolModule> | undefined;

const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<MutoolModule>;

async function loadMuPdf(): Promise<MutoolModule> {
  mupdfModulePromise ??= dynamicImport('mupdf');
  return mupdfModulePromise;
}

function buildMutoolSaveOptions(quality: CompressionQuality = CompressionQuality.MEDIUM): string {
  switch (quality) {
    case CompressionQuality.LOW:
    case CompressionQuality.MAXIMUM:
      return 'garbage=4,compress,compress-fonts,compress-images,clean';
    case CompressionQuality.HIGH:
      return 'garbage=2,compress';
    case CompressionQuality.MEDIUM:
    default:
      return 'garbage=3,compress,compress-fonts';
  }
}

function toBuffer(output: MutoolBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  if ('asUint8Array' in output && typeof output.asUint8Array === 'function') {
    return Buffer.from(output.asUint8Array());
  }

  return Buffer.from(output as Uint8Array);
}

export async function runMutoolCompression(
  input: Buffer,
  options: Partial<CondenseOptions> = {},
): Promise<{ output: Buffer; pagesProcessed: number }> {
  const { Document } = await loadMuPdf();
  const doc = Document.openDocument(input, MIME_PDF);

  try {
    const output = toBuffer(
      doc.saveToBuffer(buildMutoolSaveOptions(options.quality)),
    );
    const pdfDoc = await PDFDocument.load(output);

    return {
      output,
      pagesProcessed: pdfDoc.getPageCount(),
    };
  } finally {
    doc.destroy?.();
  }
}

export const __private__ = {
  buildMutoolSaveOptions,
};
