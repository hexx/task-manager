import type { Root } from 'org-toolkit';

export type ImportFormat = 'json' | 'markdown';

export type ExportFormat = 'json' | 'markdown' | 'html';

export type OrgListKind = 'unordered' | 'ordered';

export interface OrgListInput {
  readonly kind: OrgListKind;
  readonly items: ReadonlyArray<string>;
}

export interface OrgSectionInput {
  readonly heading: string;
  readonly level?: number;
  readonly todoKeyword?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly paragraphs?: ReadonlyArray<string>;
  readonly lists?: ReadonlyArray<OrgListInput>;
  readonly children?: ReadonlyArray<OrgSectionInput>;
}

export interface OrgImportDocument {
  readonly title?: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly paragraphs?: ReadonlyArray<string>;
  readonly lists?: ReadonlyArray<OrgListInput>;
  readonly sections?: ReadonlyArray<OrgSectionInput>;
}

export interface FileImportOptions {
  readonly format: ImportFormat;
}

export interface FileExportOptions {
  readonly format: ExportFormat;
}

export type OrgRoot = Root;

export class OrgConversionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OrgConversionError';
  }
}
