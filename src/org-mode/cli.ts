import { importFileToOrg, exportFileFromOrg } from './files';
import { OrgConversionError } from './types';
import type { ExportFormat, ImportFormat } from './types';

type Command = 'import' | 'export';

interface CliOptions {
  readonly command: Command;
  readonly inputPath: string;
  readonly outputPath?: string;
  readonly format: ImportFormat | ExportFormat;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options instanceof Error) {
    throw options;
  }

  const output =
    options.command === 'import'
      ? await importFileToOrg(options.inputPath, { format: options.format as ImportFormat }, options.outputPath)
      : await exportFileFromOrg(options.inputPath, { format: options.format as ExportFormat }, options.outputPath);

  if (options.outputPath === undefined) {
    process.stdout.write(`${output}\n`);
  }
}

function parseArgs(argv: ReadonlyArray<string>): CliOptions | Error {
  const [command, ...rest] = argv;
  if (command !== 'import' && command !== 'export') {
    return new Error(renderUsage());
  }

  const flags = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      return new Error(`Unexpected argument: ${token}\n\n${renderUsage()}`);
    }

    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      return new Error(`Missing value for ${token}\n\n${renderUsage()}`);
    }

    flags.set(token.slice(2), value);
    index += 1;
  }

  const inputPath = flags.get('input');
  const format = flags.get('format');
  const outputPath = flags.get('output');

  if (inputPath === undefined || format === undefined) {
    return new Error(`Missing --input or --format.\n\n${renderUsage()}`);
  }

  if (command === 'import' && format !== 'json' && format !== 'markdown') {
    return new Error(`Unsupported import format: ${format}`);
  }

  if (command === 'export' && format !== 'json' && format !== 'markdown' && format !== 'html') {
    return new Error(`Unsupported export format: ${format}`);
  }

  return {
    command,
    inputPath,
    outputPath,
    format: format as ImportFormat | ExportFormat,
  };
}

function renderUsage(): string {
  return [
    'Usage:',
    '  npm run org -- import --format json --input input.json --output output.org',
    '  npm run org -- import --format markdown --input input.md --output output.org',
    '  npm run org -- export --format markdown --input input.org --output output.md',
    '  npm run org -- export --format html --input input.org --output output.html',
    '  npm run org -- export --format json --input input.org --output output.json',
  ].join('\n');
}

main().catch((error: unknown) => {
  if (error instanceof OrgConversionError || error instanceof Error) {
    console.error(error.message);
    if (error instanceof OrgConversionError && error.cause !== undefined) {
      console.error(error.cause);
    }
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
