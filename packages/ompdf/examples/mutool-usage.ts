import { promises as fs } from 'node:fs';
import { compressPdf, PdfCompressionAlgorithm, PdfCompressionQuality } from 'ompdf';

async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? 'input.pdf';
  const outputPath = process.argv[3] ?? 'output-mutool.pdf';

  const input = await fs.readFile(inputPath);
  const result = await compressPdf(input, {
    filename: inputPath,
    algorithm: PdfCompressionAlgorithm.Mutool,
    quality: PdfCompressionQuality.Maximum,
  });

  await fs.writeFile(outputPath, result.data);
  console.log('Compressed PDF written to', outputPath);
  console.log(result.stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
