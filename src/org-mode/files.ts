import { readFile, writeFile } from 'node:fs/promises';
import { exportFromOrg } from './export';
import { importToOrg } from './import';
import type { FileExportOptions, FileImportOptions } from './types';

export async function importFileToOrg(
  inputPath: string,
  options: FileImportOptions,
  outputPath?: string,
): Promise<string> {
  const source = await readFile(inputPath, 'utf8');
  const output =
    options.format === 'json'
      ? importToOrg(source, 'json')
      : importToOrg(source, 'markdown');

  if (outputPath !== undefined) {
    await writeFile(outputPath, output, 'utf8');
  }

  return output;
}

export async function exportFileFromOrg(
  inputPath: string,
  options: FileExportOptions,
  outputPath?: string,
): Promise<string> {
  const source = await readFile(inputPath, 'utf8');
  const output = exportFromOrg(source, options.format);

  if (outputPath !== undefined) {
    await writeFile(outputPath, output, 'utf8');
  }

  return output;
}
