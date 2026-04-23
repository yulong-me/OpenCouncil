import { describe, expect, it } from 'vitest';
import { matchesResolvedBuiltinAgent } from '../src/db/builtinAgentCatalog.js';
import { PREVIOUS_SOFTWARE_DEVELOPMENT_AGENT_DEFINITIONS } from '../src/prompts/builtinAgents.js';

describe('builtin agent catalog matching', () => {
  it('allows catalog upgrade when only provider fields differ from an untouched builtin agent', () => {
    const definition = PREVIOUS_SOFTWARE_DEVELOPMENT_AGENT_DEFINITIONS.find(agent => agent.id === 'dev-architect');
    expect(definition?.systemPrompt).toBeTruthy();

    const existing = {
      name: definition!.name,
      role: 'WORKER',
      roleLabel: definition!.roleLabel,
      provider: 'claude-code',
      providerOpts: { thinking: true, model: 'claude-sonnet-4-6' },
      systemPrompt: definition!.systemPrompt!,
      enabled: true,
      tags: [...definition!.tags],
    };

    expect(matchesResolvedBuiltinAgent(existing, definition!, definition!.systemPrompt!, { ignoreProviderFields: true })).toBe(true);
    expect(matchesResolvedBuiltinAgent(existing, definition!, definition!.systemPrompt!)).toBe(false);
  });

  it('still refuses catalog upgrade when the user has modified the builtin prompt', () => {
    const definition = PREVIOUS_SOFTWARE_DEVELOPMENT_AGENT_DEFINITIONS.find(agent => agent.id === 'dev-reviewer');
    expect(definition?.systemPrompt).toBeTruthy();

    const existing = {
      name: definition!.name,
      role: 'WORKER',
      roleLabel: definition!.roleLabel,
      provider: definition!.provider,
      providerOpts: { ...definition!.providerOpts },
      systemPrompt: `${definition!.systemPrompt!}\n\n# user tweak`,
      enabled: true,
      tags: [...definition!.tags],
    };

    expect(matchesResolvedBuiltinAgent(existing, definition!, definition!.systemPrompt!, { ignoreProviderFields: true })).toBe(false);
  });
});
