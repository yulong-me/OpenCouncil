import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  assembleProviderRuntime,
  deleteManagedSkill,
  discoverSystemGlobalSkills,
  discoverWorkspaceSkills,
  getManagedSkill,
  importManagedSkillFolder,
  listManagedSkills,
  resolveEffectiveSkills,
} from '../src/services/skills.js';
import { runtimePaths } from '../src/config/runtimePaths.js';

async function writeSkill(dir: string, name: string, description: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'SKILL.md'), [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    '---',
    '',
    `# ${name}`,
    '',
    description,
    '',
  ].join('\n'));
}

const cleanupDirs: string[] = [];
const cleanupSkillNames: string[] = [];
const originalHome = process.env.HOME;

afterEach(async () => {
  process.env.HOME = originalHome;
  await Promise.all(cleanupSkillNames.splice(0).map(name => deleteManagedSkill(name).catch(() => 'NOT_FOUND')));
  await Promise.all(cleanupDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('skills service', () => {
  it('discovers workspace-local skills and keeps the nearest duplicate', async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-home-empty-'));
    cleanupDirs.push(home);
    process.env.HOME = home;

    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-skills-'));
    cleanupDirs.push(repoRoot);
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });

    await writeSkill(path.join(repoRoot, '.agents', 'skills', 'review'), 'review', 'repo review');
    await writeSkill(path.join(repoRoot, '.claude', 'skills', 'claude-only'), 'claude-only', 'claude only');
    await writeSkill(path.join(repoRoot, '.codex', 'skills', 'codex-only'), 'codex-only', 'codex only');

    const workspace = path.join(repoRoot, 'packages', 'app');
    await fs.mkdir(workspace, { recursive: true });
    await writeSkill(path.join(workspace, '.agents', 'skills', 'review'), 'review', 'workspace review');
    await writeSkill(path.join(workspace, '.opencode', 'skills', 'opencode-only'), 'opencode-only', 'opencode only');

    const discovered = await discoverWorkspaceSkills(workspace);
    const byName = Object.fromEntries(discovered.skills.map(skill => [skill.name, skill]));

    expect(Object.keys(byName).sort()).toEqual(['claude-only', 'codex-only', 'opencode-only', 'review']);
    expect(byName.review?.description).toBe('workspace review');
    expect(byName['claude-only']?.providerCompat).toEqual(['claude-code']);
    expect(byName['codex-only']?.providerCompat).toEqual(['codex']);
    expect(byName['opencode-only']?.providerCompat).toEqual(['opencode']);
  });

  it('assembles provider runtime with workspace and skill symlinks', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-runtime-workspace-'));
    const skillBundle = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-runtime-skill-'));
    cleanupDirs.push(workspace, skillBundle);
    await fs.writeFile(path.join(skillBundle, 'SKILL.md'), '# test\n');

    const roomId = `room-${randomUUID()}`;
    const result = await assembleProviderRuntime({
      roomId,
      providerName: 'claude-code',
      effectiveWorkspace: workspace,
      effectiveSkills: [{
        name: 'review',
        description: 'Review code',
        mode: 'required',
        source: 'room',
        sourceLabel: 'Room',
        sourcePath: path.join(skillBundle, 'SKILL.md'),
        bundlePath: skillBundle,
        providerCompat: ['claude-code'],
        enabled: true,
        checksum: 'abc',
      }],
    });
    cleanupDirs.push(path.join(runtimePaths.providerRuntimeBaseDir, 'rooms', roomId));

    const workspaceLink = await fs.readlink(path.join(result.providerRuntimeDir, 'workspace'));
    const skillLink = await fs.readlink(path.join(result.providerRuntimeDir, '.claude', 'skills', 'review'));

    expect(workspaceLink).toBe(workspace);
    expect(skillLink).toBe(skillBundle);
  });

  it('exposes provider skills from the real workspace through a symlinked skills directory', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-runtime-workspace-'));
    const skillBundle = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-runtime-skill-'));
    cleanupDirs.push(workspace, skillBundle);
    await fs.writeFile(path.join(skillBundle, 'SKILL.md'), '# test\n');

    const roomId = `room-${randomUUID()}`;
    const result = await assembleProviderRuntime({
      roomId,
      providerName: 'opencode',
      effectiveWorkspace: workspace,
      effectiveSkills: [{
        name: 'review',
        description: 'Review code',
        mode: 'required',
        source: 'team-agent',
        sourceLabel: 'Team',
        sourcePath: path.join(skillBundle, 'SKILL.md'),
        bundlePath: skillBundle,
        providerCompat: ['opencode'],
        enabled: true,
        checksum: 'abc',
      }],
    });
    cleanupDirs.push(path.join(runtimePaths.providerRuntimeBaseDir, 'rooms', roomId));

    const workspaceSkillDir = path.join(workspace, '.opencode', 'skills');
    expect((await fs.lstat(workspaceSkillDir)).isSymbolicLink()).toBe(true);
    expect(await fs.readlink(workspaceSkillDir)).toBe(path.join(result.providerRuntimeDir, '.opencode', 'skills'));
    expect(await fs.readlink(path.join(workspaceSkillDir, 'review'))).toBe(skillBundle);
  });

  it('assembles Codex provider runtime under .codex/skills', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-runtime-workspace-'));
    const skillBundle = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-runtime-skill-'));
    cleanupDirs.push(workspace, skillBundle);
    await fs.writeFile(path.join(skillBundle, 'SKILL.md'), '# test\n');

    const roomId = `room-${randomUUID()}`;
    const result = await assembleProviderRuntime({
      roomId,
      providerName: 'codex',
      effectiveWorkspace: workspace,
      effectiveSkills: [{
        name: 'review',
        description: 'Review code',
        mode: 'required',
        source: 'room',
        sourceLabel: 'Room',
        sourcePath: path.join(skillBundle, 'SKILL.md'),
        bundlePath: skillBundle,
        providerCompat: ['codex'],
        enabled: true,
        checksum: 'abc',
      }],
    });
    cleanupDirs.push(path.join(runtimePaths.providerRuntimeBaseDir, 'rooms', roomId));

    const workspaceLink = await fs.readlink(path.join(result.providerRuntimeDir, 'workspace'));
    const skillLink = await fs.readlink(path.join(result.providerRuntimeDir, '.codex', 'skills', 'review'));

    expect(workspaceLink).toBe(workspace);
    expect(skillLink).toBe(skillBundle);
  });

  it('discovers system global skills from claude, opencode, and codex home directories', async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-home-'));
    cleanupDirs.push(home);
    process.env.HOME = home;

    await writeSkill(path.join(home, '.claude', 'skills', 'claude-global'), 'claude-global', 'global claude');
    await writeSkill(path.join(home, '.config', 'opencode', 'skills', 'opencode-global'), 'opencode-global', 'global opencode');
    await writeSkill(path.join(home, '.codex', 'skills', 'codex-global'), 'codex-global', 'global codex');
    await writeSkill(path.join(home, '.agents', 'skills', 'shared-global'), 'shared-global', 'global shared');

    const discovered = await discoverSystemGlobalSkills();
    const byName = Object.fromEntries(discovered.map(skill => [skill.name, skill]));

    expect(Object.keys(byName).sort()).toEqual(['claude-global', 'codex-global', 'opencode-global', 'shared-global']);
    expect(byName['claude-global']?.sourceType).toBe('global');
    expect(byName['opencode-global']?.providerCompat).toEqual(['opencode']);
    expect(byName['codex-global']?.providerCompat).toEqual(['codex']);
    expect(byName['shared-global']?.providerCompat).toEqual(['claude-code', 'opencode', 'codex']);
  });

  it('resolves explicitly selected scanned Team skills even when default discovery is disabled', async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-home-'));
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-workspace-'));
    cleanupDirs.push(home, workspace);
    process.env.HOME = home;

    const skillDir = path.join(home, '.agents', 'skills', 'shared-global');
    await writeSkill(skillDir, 'shared-global', 'global shared');

    const result = await resolveEffectiveSkills({
      roomId: 'room-selected-global',
      agentConfigId: 'member-reviewer',
      workspacePath: workspace,
      providerName: 'opencode',
      teamSkillRefs: [{
        source: 'global',
        name: 'shared-global',
        sourcePath: path.join(skillDir, 'SKILL.md'),
      }],
      includeDiscoveredSkills: false,
    } as Parameters<typeof resolveEffectiveSkills>[0] & { teamSkillRefs: unknown[] });

    expect(result.effective).toEqual([
      expect.objectContaining({
        name: 'shared-global',
        mode: 'required',
        source: 'team-agent',
        sourceLabel: 'Team',
        sourcePath: path.join(skillDir, 'SKILL.md'),
      }),
    ]);
  });

  it('imports a skill folder into managed skills', async () => {
    const source = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-import-skill-'));
    cleanupDirs.push(source);
    const skillName = `imported-skill-${randomUUID().slice(0, 8)}`;
    await writeSkill(source, skillName, 'import me');
    await fs.mkdir(path.join(source, 'references'), { recursive: true });
    await fs.writeFile(path.join(source, 'references', 'notes.md'), 'hello');

    const imported = await importManagedSkillFolder({ sourcePath: source });
    cleanupSkillNames.push(imported.name);
    const managedDir = path.join(runtimePaths.managedSkillsDir, imported.name);
    cleanupDirs.push(managedDir);

    expect(imported.name).toBe(skillName);
    expect(await fs.readFile(path.join(managedDir, 'SKILL.md'), 'utf-8')).toContain('import me');
    expect(await fs.readFile(path.join(managedDir, 'references', 'notes.md'), 'utf-8')).toBe('hello');
  });

  it('prunes stale managed skill records when their backing SKILL.md is gone', async () => {
    const source = await fs.mkdtemp(path.join(os.tmpdir(), 'opencouncil-stale-skill-'));
    cleanupDirs.push(source);
    const skillName = `stale-skill-${randomUUID().slice(0, 8)}`;
    await writeSkill(source, skillName, 'temporary stale skill');

    const imported = await importManagedSkillFolder({ sourcePath: source });
    cleanupSkillNames.push(imported.name);
    const managedDir = path.join(runtimePaths.managedSkillsDir, imported.name);

    expect(await getManagedSkill(imported.name)).toEqual(expect.objectContaining({ name: imported.name }));

    await fs.rm(managedDir, { recursive: true, force: true });

    expect(await getManagedSkill(imported.name)).toBeUndefined();
    expect((await listManagedSkills()).some(skill => skill.name === imported.name)).toBe(false);
  });
});
