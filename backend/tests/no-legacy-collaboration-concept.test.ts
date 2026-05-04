import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

function read(relativePath: string): string {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf-8');
}

const legacyRoot = ['s', 'c', 'e', 'n', 'e'].join('');
const legacyPlural = `${legacyRoot}s`;
const legacyTitle = `${legacyRoot[0].toUpperCase()}${legacyRoot.slice(1)}`;

describe('legacy collaboration concept removal', () => {
  it('does not expose legacy tables, columns, routes, or seed files in backend runtime code', () => {
    const schema = read('src/db/schema.sql');
    const server = read('src/server.ts');

    expect(schema).not.toMatch(new RegExp(`\\bCREATE TABLE IF NOT EXISTS ${legacyPlural}\\b`));
    expect(schema).not.toMatch(new RegExp(`\\b${legacyRoot}_id\\b`));
    expect(schema).not.toMatch(new RegExp(`\\bsource_${legacyRoot}_id\\b`));
    expect(server).not.toContain(`/api/${legacyPlural}`);
    expect(server).not.toContain(`${legacyPlural}Router`);

    for (const removedPath of [
      `src/db/repositories/${legacyPlural}.ts`,
      `src/routes/${legacyPlural}.ts`,
      `src/prompts/builtin${legacyTitle}s.ts`,
    ]) {
      expect(fs.existsSync(new URL(`../${removedPath}`, import.meta.url))).toBe(false);
    }
  });
});
