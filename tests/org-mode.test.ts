import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportFileFromOrg, exportFromOrg, importFileToOrg, importToOrg, OrgConversionError } from '../src/org-mode';

describe('org-mode conversions', () => {
  it('imports structured json into org text', () => {
    const org = importToOrg({
      title: 'Team Notes',
      metadata: { AUTHOR: 'Ada' },
      paragraphs: ['Overview'],
      lists: [{ kind: 'unordered', items: ['Ship docs', 'Review copy'] }],
      sections: [
        {
          heading: 'Plan',
          todoKeyword: 'TODO',
          tags: ['work'],
          paragraphs: ['Draft milestones'],
          children: [
            {
              heading: 'Subtask',
              paragraphs: ['Nested work'],
            },
          ],
        },
      ],
    });

    expect(org).toContain('#+TITLE: Team Notes');
    expect(org).toContain('#+AUTHOR: Ada');
    expect(org).toContain('* TODO Plan :work:');
    expect(org).toContain('** Subtask');
  });

  it('imports markdown into org text', () => {
    const org = importToOrg(
      ['# Heading', '', 'Intro line', '', '- first', '- second', '', '## Details', 'More'].join('\n'),
      'markdown',
    );

    expect(org).toContain('* Heading');
    expect(org).toContain('- first');
    expect(org).toContain('** Details');
  });

  it('exports org text to markdown, html, and json', () => {
    const org = ['#+TITLE: Notes', '', '* TODO Ship docs :work:', '- [ ] Draft README'].join('\n');

    expect(exportFromOrg(org, 'markdown')).toContain('Ship docs');
    expect(exportFromOrg(org, 'html')).toContain('<h1');

    const json = JSON.parse(exportFromOrg(org, 'json')) as { metadata: Record<string, string> };
    expect(json.metadata).toMatchObject({ TITLE: 'Notes' });
  });

  it('throws on invalid json input', () => {
    expect(() => importToOrg('{', 'json')).toThrow(OrgConversionError);
  });

  it('reads and writes files through the helper functions', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'org-mode-'));
    const inputPath = join(tempDir, 'input.json');
    const outputPath = join(tempDir, 'output.org');
    const exportPath = join(tempDir, 'output.md');

    await writeFile(
      inputPath,
      JSON.stringify({
        title: 'File Notes',
        sections: [{ heading: 'One', paragraphs: ['First'] }],
      }),
      'utf8',
    );

    const imported = await importFileToOrg(inputPath, { format: 'json' }, outputPath);
    expect(imported).toContain('#+TITLE: File Notes');
    expect(await readFile(outputPath, 'utf8')).toBe(imported);

    await writeFile(
      join(tempDir, 'input.org'),
      ['#+TITLE: File Notes', '', '* One', 'First'].join('\n'),
      'utf8',
    );

    const exported = await exportFileFromOrg(join(tempDir, 'input.org'), { format: 'markdown' }, exportPath);
    expect(exported).toContain('One');
    expect(await readFile(exportPath, 'utf8')).toBe(exported);
  });
});
