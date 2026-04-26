export const BUILTIN_PROVIDER_DEFINITIONS = [
  { name: 'claude-code', label: 'Claude Code', cliPath: 'claude', defaultModel: 'claude-sonnet-4-6', contextWindow: 200000, apiKey: '', baseUrl: '', timeout: 1800, thinking: true },
  { name: 'opencode',    label: 'OpenCode',    cliPath: '~/.opencode/bin/opencode', defaultModel: 'MiniMax-M2.7', contextWindow: 200000, apiKey: '', baseUrl: '', timeout: 1800, thinking: true },
  { name: 'codex',       label: 'Codex CLI',   cliPath: 'codex', defaultModel: '', contextWindow: 272000, apiKey: '', baseUrl: '', timeout: 1800, thinking: true },
] as const;
