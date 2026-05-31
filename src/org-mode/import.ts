import {
  createHeading,
  createList,
  createListItem,
  createParagraph,
  createRoot,
  stringify,
} from 'org-toolkit';
import type {
  OrgImportDocument,
  OrgListInput,
  OrgSectionInput,
  ImportFormat,
} from './types';
import { OrgConversionError } from './types';

type MutableOrgSectionInput = {
  heading: string;
  level?: number;
  todoKeyword?: string;
  tags?: string[];
  paragraphs?: string[];
  lists?: OrgListInput[];
  children?: MutableOrgSectionInput[];
};

type MutableOrgImportDocument = {
  title?: string;
  metadata?: Record<string, string>;
  paragraphs?: string[];
  lists?: OrgListInput[];
  sections?: MutableOrgSectionInput[];
};

export function importToOrg(input: string, format: ImportFormat): string;
export function importToOrg(document: OrgImportDocument): string;
export function importToOrg(input: OrgImportDocument | string, format?: ImportFormat): string {
  const resolvedFormat = format ?? (typeof input === 'string' ? 'markdown' : 'json');

  try {
    const document =
      resolvedFormat === 'json'
        ? normalizeJsonDocument(input)
        : normalizeMarkdownDocument(input);

    return stringify(buildRoot(document));
  } catch (error) {
    if (error instanceof OrgConversionError) {
      throw error;
    }

    throw new OrgConversionError('Failed to convert the input data to org-mode text.', {
      cause: error,
    });
  }
}

function normalizeJsonDocument(input: OrgImportDocument | string): OrgImportDocument {
  const raw = typeof input === 'string' ? parseJsonInput(input) : input;
  if (!isRecord(raw)) {
    throw new OrgConversionError('JSON import input must be an object.');
  }

  const metadata = normalizeStringRecord(raw.metadata, 'metadata');
  const title = normalizeOptionalString(raw.title, 'title');
  const paragraphs = normalizeStringArray(raw.paragraphs, 'paragraphs');
  const lists = normalizeListArray(raw.lists, 'lists');
  const sections = normalizeSectionArray(raw.sections, 'sections');

  return {
    title,
    metadata,
    paragraphs,
    lists,
    sections,
  };
}

function parseJsonInput(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch (error) {
    throw new OrgConversionError('Invalid JSON import input.', { cause: error });
  }
}

function normalizeMarkdownDocument(input: OrgImportDocument | string): OrgImportDocument {
  if (typeof input !== 'string') {
    throw new OrgConversionError('Markdown import expects a string input.');
  }

  const document: MutableOrgImportDocument = {
    paragraphs: [],
    lists: [],
    sections: [],
  };

  const stack: MutableOrgSectionInput[] = [];
  let paragraphLines: string[] = [];
  let listState: OrgListInput | null = null;

  const currentContainer = (): MutableOrgImportDocument | MutableOrgSectionInput =>
    stack.at(-1) ?? document;

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }

    const text = paragraphLines.join(' ').trim();
    paragraphLines = [];
    if (!text) {
      return;
    }

    appendParagraph(currentContainer(), text);
  };

  const flushList = (): void => {
    if (listState === null || listState.items.length === 0) {
      listState = null;
      return;
    }

    appendList(currentContainer(), listState);
    listState = null;
  };

  const startSection = (heading: string, level: number): void => {
    const section: MutableOrgSectionInput = {
      heading,
      level,
      paragraphs: [],
      lists: [],
      children: [],
    };

    while (stack.length > 0 && (stack.at(-1)?.level ?? 1) >= level) {
      stack.pop();
    }

    const parent = stack.at(-1);
    if (parent === undefined) {
      document.sections = [...(document.sections ?? []), section];
    } else {
      parent.children = [...(parent.children ?? []), section];
    }

    stack.push(section);
  };

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.trim().length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch !== null) {
      flushParagraph();
      flushList();
      startSection(headingMatch[2].trim(), headingMatch[1].length);
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (listMatch !== null) {
      flushParagraph();
      const itemKind: OrgListInput['kind'] = /^\d+[.)]$/.test(listMatch[2] ?? '')
        ? 'ordered'
        : 'unordered';
      const itemText = listMatch[3].trim();

      if (listState === null || listState.kind !== itemKind) {
        flushList();
        listState = { kind: itemKind, items: [] };
      }

      listState = {
        kind: listState.kind,
        items: [...listState.items, itemText],
      };
      continue;
    }

    flushList();
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushList();

  return document;
}

function buildRoot(document: OrgImportDocument) {
  const children = [
    ...buildParagraphNodes(document.paragraphs),
    ...buildListNodes(document.lists),
    ...buildSectionNodes(document.sections),
  ];

  return createRoot(buildMetadata(document), children);
}

function buildSectionNodes(
  sections: ReadonlyArray<OrgSectionInput> | undefined,
  level = 1,
): ReturnType<typeof buildNodesFromSections> {
  return buildNodesFromSections(sections ?? [], level);
}

function buildNodesFromSections(
  sections: ReadonlyArray<OrgSectionInput>,
  level: number,
) {
  const nodes: Array<ReturnType<typeof createHeading> | ReturnType<typeof createParagraph> | ReturnType<typeof createList>> = [];

  for (const section of sections) {
    const headingLevel = section.level ?? level;
    const headingText = section.heading.trim();
    if (!headingText) {
      throw new OrgConversionError('Section headings must not be empty.');
    }

    nodes.push(
      createHeading(headingLevel, headingText, {
        todoKeyword: section.todoKeyword,
        tags: section.tags,
      }),
    );
    nodes.push(...buildParagraphNodes(section.paragraphs));
    nodes.push(...buildListNodes(section.lists));
    nodes.push(...buildNodesFromSections(section.children ?? [], headingLevel + 1));
  }

  return nodes;
}

function buildParagraphNodes(paragraphs: ReadonlyArray<string> | undefined) {
  return (paragraphs ?? [])
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => createParagraph(paragraph));
}

function buildListNodes(lists: ReadonlyArray<OrgListInput> | undefined) {
  return (lists ?? [])
    .filter((list) => list.items.length > 0)
    .map((list) =>
      createList(
        list.kind,
        list.items.map((item) =>
          createListItem(item.trim(), { marker: list.kind === 'ordered' ? '1.' : '-' }),
        ),
      ),
    );
}

function buildMetadata(document: OrgImportDocument): Readonly<Record<string, string>> {
  const metadata = { ...(document.metadata ?? {}) };
  if (document.title !== undefined && document.title.trim().length > 0) {
    metadata.TITLE = document.title.trim();
  }

  return metadata;
}

function appendParagraph(
  target: MutableOrgImportDocument | MutableOrgSectionInput,
  paragraph: string,
): void {
  target.paragraphs = [...(target.paragraphs ?? []), paragraph];
}

function appendList(
  target: MutableOrgImportDocument | MutableOrgSectionInput,
  list: OrgListInput,
): void {
  target.lists = [...(target.lists ?? []), list];
}

function normalizeStringRecord(
  value: unknown,
  label: string,
): Readonly<Record<string, string>> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new OrgConversionError(`${label} must be an object.`);
  }

  const entries: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue !== 'string') {
      throw new OrgConversionError(`${label} values must be strings.`);
    }

    entries[key] = rawValue;
  }

  return entries;
}

function normalizeOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new OrgConversionError(`${label} must be a string.`);
  }

  return value.trim();
}

function normalizeStringArray(
  value: unknown,
  label: string,
): ReadonlyArray<string> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new OrgConversionError(`${label} must be an array of strings.`);
  }

  return value.map((entry) => entry.trim());
}

function normalizeListArray(
  value: unknown,
  label: string,
): ReadonlyArray<OrgListInput> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new OrgConversionError(`${label} must be an array.`);
  }

  return value.map((entry, index) => normalizeList(entry, `${label}[${index}]`));
}

function normalizeSectionArray(
  value: unknown,
  label: string,
): ReadonlyArray<OrgSectionInput> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new OrgConversionError(`${label} must be an array.`);
  }

  return value.map((entry, index) => normalizeSection(entry, `${label}[${index}]`));
}

function normalizeList(value: unknown, label: string): OrgListInput {
  if (!isRecord(value)) {
    throw new OrgConversionError(`${label} must be an object.`);
  }

  const kind = value.kind;
  if (kind !== 'unordered' && kind !== 'ordered') {
    throw new OrgConversionError(`${label}.kind must be "unordered" or "ordered".`);
  }

  const items = normalizeStringArray(value.items, `${label}.items`);
  if (items === undefined || items.length === 0) {
    throw new OrgConversionError(`${label}.items must contain at least one string.`);
  }

  return {
    kind,
    items,
  };
}

function normalizeSection(value: unknown, label: string): OrgSectionInput {
  if (!isRecord(value)) {
    throw new OrgConversionError(`${label} must be an object.`);
  }

  const heading = normalizeOptionalString(value.heading, `${label}.heading`);
  if (heading === undefined || heading.length === 0) {
    throw new OrgConversionError(`${label}.heading must be a non-empty string.`);
  }

  const level =
    value.level === undefined
      ? undefined
      : normalizePositiveInteger(value.level, `${label}.level`);

  return {
    heading,
    level,
    todoKeyword: normalizeOptionalString(value.todoKeyword, `${label}.todoKeyword`),
    tags: normalizeStringArray(value.tags, `${label}.tags`),
    paragraphs: normalizeStringArray(value.paragraphs, `${label}.paragraphs`),
    lists: normalizeListArray(value.lists, `${label}.lists`),
    children: normalizeSectionArray(value.children, `${label}.children`),
  };
}

function normalizePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new OrgConversionError(`${label} must be a positive integer.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
