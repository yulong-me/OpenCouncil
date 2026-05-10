import path from 'path';

function normalizeCeilingPath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? path.resolve(trimmed) : undefined;
}

function workspaceCeilingPaths(value: string | undefined): string[] {
  const workspace = normalizeCeilingPath(value);
  if (!workspace) return [];
  const parent = path.dirname(workspace);
  return parent === workspace ? [workspace] : [parent, workspace];
}

export function withWorkspaceGitCeiling(
  env: Record<string, string>,
  ...workspaceCandidates: Array<string | undefined>
): Record<string, string> {
  const workspaces = workspaceCandidates
    .flatMap(workspaceCeilingPaths);
  const ceilings = Array.from(new Set(workspaces));

  if (ceilings.length === 0) return env;
  const existing = env.GIT_CEILING_DIRECTORIES?.trim();
  return {
    ...env,
    GIT_CEILING_DIRECTORIES: existing
      ? `${ceilings.join(path.delimiter)}${path.delimiter}${existing}`
      : ceilings.join(path.delimiter),
  };
}
