import { promises as fs } from 'node:fs';
import {
  compressPdf,
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
  PdfImageFormat,
} from 'ompdf';

async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? 'input.pdf';
  const outputPath = process.argv[3] ?? 'output-photon.pdf';

  const input = await fs.readFile(inputPath);
  const result = await compressPdf(input, {
    filename: inputPath,
    algorithm: PdfCompressionAlgorithm.Photon,
    quality: PdfCompressionQuality.Medium,
    photon: {
      dpi: 96,
      format: PdfImageFormat.Jpeg,
      quality: 60,
    },
  });

  await fs.writeFile(outputPath, result.data);
  console.log('Compressed PDF written to', outputPath);
  console.log(result.stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
