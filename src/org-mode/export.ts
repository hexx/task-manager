import { OrgParseError, parse, toHtml, toMarkdown } from 'org-toolkit';
import type { ExportFormat } from './types';
import { OrgConversionError } from './types';

export function exportFromOrg(orgText: string, format: ExportFormat): string {
  try {
    const ast = parse(orgText);

    switch (format) {
      case 'markdown':
        return toMarkdown(ast);
      case 'html':
        return toHtml(ast);
      case 'json':
        return JSON.stringify(ast, null, 2);
      default: {
        const exhaustiveCheck: never = format;
        return exhaustiveCheck;
      }
    }
  } catch (error) {
    if (error instanceof OrgConversionError) {
      throw error;
    }

    if (error instanceof OrgParseError) {
      throw new OrgConversionError('Failed to parse org-mode text.', { cause: error });
    }

    throw new OrgConversionError('Failed to export org-mode text.', { cause: error });
  }
}
