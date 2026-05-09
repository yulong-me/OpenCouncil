import { describe, expect, it } from 'vitest';

import type { ProviderConfig } from '../src/config/providerConfig.js';
import { parseClaudeAssistantToolUseEvents } from '../src/services/providers/claudeCode.js';
import { buildCodexProviderLaunch, parseCodexJsonEvents } from '../src/services/providers/codex.js';
import { extractOpenCodeErrorMessage, parseOpenCodeToolUseEvent } from '../src/services/providers/opencode.js';
import { buildClaudeProviderLaunch } from '../src/services/providers/claudeCode.js';
import { buildOpenCodeProviderLaunch } from '../src/services/providers/opencode.js';

const baseProviderConfig: ProviderConfig = {
  name: 'test-provider',
  label: 'Test Provider',
  cliPath: '~/bin/test-cli',
  defaultModel: 'test-model',
  contextWindow: 200000,
  apiKey: 'test-key',
  baseUrl: 'https://provider.example.com',
  timeout: 90,
  thinking: true,
  lastTested: null,
  lastTestResult: null,
};

describe('provider tool_use parsing', () => {
  it('parses Claude Code assistant tool_use content blocks', () => {
    const events = parseClaudeAssistantToolUseEvents({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: '我先看文件' },
          { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: 'README.md' } },
        ],
      },
    }, 'agent-1');

    expect(events).toEqual([
      {
        type: 'tool_use',
        agentId: 'agent-1',
        toolName: 'Read',
        toolInput: { file_path: 'README.md' },
        callId: 'toolu_1',
      },
    ]);
  });

  it('parses OpenCode documented tool_use part format', () => {
    expect(parseOpenCodeToolUseEvent({
      type: 'tool_use',
      part: {
        id: 'part-1',
        type: 'tool_use',
        tool: 'bash',
        state: { input: { command: 'pwd' } },
      },
    }, 'agent-1')).toEqual({
      type: 'tool_use',
      agentId: 'agent-1',
      toolName: 'bash',
      toolInput: { command: 'pwd' },
      callId: 'part-1',
    });
  });

  it('parses OpenCode runtime tool part format', () => {
    expect(parseOpenCodeToolUseEvent({
      type: 'tool_use',
      part: {
        type: 'tool',
        tool: 'read',
        callID: 'call-1',
        input: { path: 'package.json' },
      },
    }, 'agent-1')).toEqual({
      type: 'tool_use',
      agentId: 'agent-1',
      toolName: 'read',
      toolInput: { path: 'package.json' },
      callId: 'call-1',
    });
  });

  it('extracts OpenCode error messages from top-level fields', () => {
    expect(extractOpenCodeErrorMessage({
      type: 'error',
      message: 'upstream temporarily unavailable',
    })).toBe('upstream temporarily unavailable');

    expect(extractOpenCodeErrorMessage({
      type: 'error',
      error: 'rate limit exceeded',
    })).toBe('rate limit exceeded');
  });

  it('extracts OpenCode error messages from nested error objects', () => {
    expect(extractOpenCodeErrorMessage({
      type: 'error',
      part: {
        type: 'error',
        error: {
          message: 'provider overloaded',
        },
      },
    })).toBe('provider overloaded');

    expect(extractOpenCodeErrorMessage({
      type: 'error',
      part: {
        type: 'error',
        error: {
          code: 'upstream_error',
          message: 'gateway timeout',
        },
      },
    })).toBe('gateway timeout');
  });

  it('builds Claude launch config with room workspace as cwd and --add-dir', () => {
    const workspace = '/Users/yulong/work/sample-project';
    const launch = buildClaudeProviderLaunch(
      'hello from claude',
      { workspace },
      { ...baseProviderConfig, name: 'claude-code', cliPath: '~/bin/claude' },
      { HOME: '/Users/tester', PATH: '/usr/bin' },
    );

    expect(launch.cliPath).toBe('/Users/tester/bin/claude');
    expect(launch.args).toEqual(expect.arrayContaining(['--model', 'test-model']));
    expect(launch.args).toEqual(expect.arrayContaining(['--add-dir', workspace]));
    expect(launch.cwd).toBe(workspace);
    expect(launch.spawnOptions).toMatchObject({
      cwd: workspace,
      timeout: 90000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(launch.env).toMatchObject({
      PATH: '/usr/bin',
      ANTHROPIC_API_KEY: 'test-key',
      ANTHROPIC_BASE_URL: 'https://provider.example.com',
    });
  });

  it('builds OpenCode launch config with room workspace as cwd and --dir', () => {
    const workspace = '/Users/yulong/work/sample-project';
    const launch = buildOpenCodeProviderLaunch(
      'hello from opencode',
      { workspace, thinking: false, model: 'google/gemini-2.5-pro' },
      { ...baseProviderConfig, name: 'opencode', cliPath: '~/bin/opencode' },
      { HOME: '/Users/tester', PATH: '/usr/bin' },
    );

    expect(launch.cliPath).toBe('/Users/tester/bin/opencode');
    expect(launch.args).toEqual(expect.arrayContaining(['run', '--dir', workspace, '--format', 'json', '--', 'hello from opencode']));
    expect(launch.args).toEqual(expect.arrayContaining(['-m', 'google/gemini-2.5-pro']));
    expect(launch.args).not.toContain('--dangerously-skip-permissions');
    expect(launch.args).not.toContain('--thinking');
    expect(launch.cwd).toBe(workspace);
    expect(launch.spawnOptions).toMatchObject({
      cwd: workspace,
      timeout: 90000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  });

  it('builds Codex launch config with json output and provider runtime workspace', () => {
    const workspace = '/Users/yulong/work/sample-project';
    const providerRuntimeDir = '/tmp/opencouncil/provider-runtime/room-1/codex';
    const launch = buildCodexProviderLaunch(
      'hello from codex',
      { workspace, providerRuntimeDir, model: 'gpt-5.2', thinking: true },
      { ...baseProviderConfig, name: 'codex', label: 'Codex CLI', cliPath: '~/bin/codex', defaultModel: '' },
      { HOME: '/Users/tester', PATH: '/usr/bin' },
    );

    expect(launch.cliPath).toBe('/Users/tester/bin/codex');
    expect(launch.cwd).toBe(providerRuntimeDir);
    expect(launch.args).toEqual(expect.arrayContaining([
      'exec',
      '--json',
      '--color',
      'never',
      '--skip-git-repo-check',
      '-C',
      `${providerRuntimeDir}/workspace`,
      '-m',
      'gpt-5.2',
      '-c',
      'model_reasoning_effort=high',
      '--dangerously-bypass-approvals-and-sandbox',
      'hello from codex',
    ]));
    expect(launch.spawnOptions).toMatchObject({
      cwd: providerRuntimeDir,
      timeout: 90000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(launch.env).toMatchObject({
      PATH: '/usr/bin',
      OPENAI_API_KEY: 'test-key',
      OPENAI_BASE_URL: 'https://provider.example.com',
    });
  });

  it('builds Codex resume launch config when a session id exists', () => {
    const launch = buildCodexProviderLaunch(
      'continue with codex',
      { sessionId: 'thread-123', thinking: false },
      { ...baseProviderConfig, name: 'codex', label: 'Codex CLI', cliPath: 'codex', defaultModel: 'gpt-5.2' },
      { PATH: '/usr/bin' },
    );

    expect(launch.args).toEqual(expect.arrayContaining([
      'exec',
      '--json',
      '--color',
      'never',
      '-m',
      'gpt-5.2',
      '-c',
      'model_reasoning_effort=low',
      'resume',
      'thread-123',
      'continue with codex',
    ]));
  });

  it('honors disabled provider-level thinking for Codex launch config', () => {
    const launch = buildCodexProviderLaunch(
      'hello from codex',
      { thinking: true },
      { ...baseProviderConfig, name: 'codex', label: 'Codex CLI', cliPath: 'codex', thinking: false },
      { PATH: '/usr/bin' },
    );

    expect(launch.args).toEqual(expect.arrayContaining([
      '-c',
      'model_reasoning_effort=low',
    ]));
    expect(launch.args).not.toContain('model_reasoning_effort=high');
  });

  it('parses current Codex exec JSONL events', () => {
    const state = { startTime: 1000, now: () => 1500 };

    expect(parseCodexJsonEvents({ type: 'thread.started', thread_id: 'thread-1' }, 'agent-1', state)).toEqual([]);
    expect(parseCodexJsonEvents({
      type: 'item.completed',
      item: { id: 'item-1', type: 'reasoning', text: 'Thinking summary' },
    }, 'agent-1', state)).toEqual([
      { type: 'thinking_delta', agentId: 'agent-1', thinking: 'Thinking summary' },
    ]);
    expect(parseCodexJsonEvents({
      type: 'item.completed',
      item: { id: 'item-2', type: 'agent_message', text: 'Final answer' },
    }, 'agent-1', state)).toEqual([
      { type: 'delta', agentId: 'agent-1', text: 'Final answer' },
    ]);
    expect(parseCodexJsonEvents({
      type: 'item.started',
      item: { id: 'item-3', type: 'command_execution', command: 'pwd', aggregated_output: '', status: 'in_progress' },
    }, 'agent-1', state)).toEqual([
      { type: 'tool_use', agentId: 'agent-1', toolName: 'command_execution', toolInput: { command: 'pwd', status: 'in_progress' }, callId: 'item-3' },
    ]);
    expect(parseCodexJsonEvents({
      type: 'turn.completed',
      usage: { input_tokens: 12, cached_input_tokens: 3, output_tokens: 4, reasoning_output_tokens: 5 },
    }, 'agent-1', state)).toEqual([
      {
        type: 'end',
        agentId: 'agent-1',
        duration_ms: 500,
        total_cost_usd: 0,
        input_tokens: 12,
        output_tokens: 4,
        sessionId: 'thread-1',
        total_tokens: 24,
        cache_read_tokens: 3,
        cache_write_tokens: 0,
        reasoning_tokens: 5,
        last_turn_input_tokens: 12,
      },
    ]);
  });

  it('parses legacy Codex exec msg-wrapped events', () => {
    const state = { startTime: 1000, now: () => 1750 };

    expect(parseCodexJsonEvents({
      id: '0',
      msg: { type: 'task_started', model_context_window: 272000 },
    }, 'agent-1', state)).toEqual([
      { type: 'start', agentId: 'agent-1', timestamp: 1750, messageId: '0' },
    ]);
    expect(parseCodexJsonEvents({
      id: '0',
      msg: { type: 'agent_message_delta', delta: 'Hello' },
    }, 'agent-1', state)).toEqual([
      { type: 'delta', agentId: 'agent-1', text: 'Hello' },
    ]);
    expect(parseCodexJsonEvents({
      id: '0',
      msg: {
        type: 'token_count',
        info: {
          total_token_usage: { input_tokens: 2, cached_input_tokens: 1, output_tokens: 3, reasoning_output_tokens: 4, total_tokens: 10 },
          model_context_window: 272000,
        },
      },
    }, 'agent-1', state)).toEqual([
      {
        type: 'end',
        agentId: 'agent-1',
        duration_ms: 750,
        total_cost_usd: 0,
        input_tokens: 2,
        output_tokens: 3,
        total_tokens: 10,
        cache_read_tokens: 1,
        cache_write_tokens: 0,
        reasoning_tokens: 4,
        last_turn_input_tokens: 2,
        context_window_tokens: 272000,
      },
    ]);
  });

  it('does not force the provider default model for OpenCode', () => {
    const launch = buildOpenCodeProviderLaunch(
      'hello from opencode',
      {},
      { ...baseProviderConfig, name: 'opencode', cliPath: '~/bin/opencode', defaultModel: 'MiniMax-M2.7' },
      { HOME: '/Users/tester', PATH: '/usr/bin' },
    );

    expect(launch.args).not.toContain('-m');
    expect(launch.args).not.toContain('MiniMax-M2.7');
    expect(launch.args).not.toContain('--dangerously-skip-permissions');
  });

  it('falls back to the default cwd when room workspace is absent', () => {
    const claudeLaunch = buildClaudeProviderLaunch(
      'no workspace',
      {},
      { ...baseProviderConfig, name: 'claude-code', cliPath: 'claude' },
      { PATH: '/usr/bin' },
    );
    const opencodeLaunch = buildOpenCodeProviderLaunch(
      'no workspace',
      {},
      { ...baseProviderConfig, name: 'opencode', cliPath: 'opencode' },
      { PATH: '/usr/bin' },
    );

    expect(claudeLaunch.cwd).toBe(process.cwd());
    expect(claudeLaunch.args).not.toContain('--add-dir');
    expect(opencodeLaunch.cwd).toBe('/tmp');
    expect(opencodeLaunch.args).not.toContain('--dir');
    expect(opencodeLaunch.args).not.toContain('-m');
    expect(opencodeLaunch.args).not.toContain('--dangerously-skip-permissions');
  });
});
