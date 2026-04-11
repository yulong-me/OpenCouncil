import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { ClaudeEvent } from './index.js';
import { getProvider } from '../../config/providerConfig.js';

function telemetry(event: 'call_start' | 'call_end' | 'call_error', meta: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [PROVIDER:opencode] ${event} ${JSON.stringify(meta)}`);
}

export async function* streamOpenCodeProvider(
  prompt: string,
  agentId: string,
  opts: Record<string, unknown> = {},
): AsyncGenerator<ClaudeEvent, void, undefined> {
  const start = Date.now();
  const providerCfg = getProvider('opencode');
  const timeout = (opts.timeout as number) ?? (providerCfg?.timeout ?? 90000);
  const model = opts.model as string | undefined ?? providerCfg?.defaultModel;
  const thinking = opts.thinking !== false; // default true
  const sessionId = opts.sessionId as string | undefined;

  // Resolve CLI path (expand ~)
  const cliPath = (providerCfg?.cliPath ?? 'opencode').replace(/^~/, process.env.HOME || '/root');

  // Build environment: inject API key and base URL if configured
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (providerCfg?.apiKey) env.ANTHROPIC_API_KEY = providerCfg.apiKey;
  if (providerCfg?.baseUrl) env.ANTHROPIC_BASE_URL = providerCfg.baseUrl;

  telemetry('call_start', { agentId, promptLength: prompt.length, timeout, model, thinking, sessionId: sessionId ?? 'new', cliPath });

  // Build args: opencode run [opts] -- <prompt>
  // Critical: always use --format json (clowder-ai reference implementation)
  const args: string[] = ['run'];
  if (sessionId) {
    args.push('--session', sessionId);
  }
  if (thinking) {
    args.push('--thinking');
  }
  if (model) {
    args.push('-m', model);
  }
  args.push('--format', 'json');
  args.push('--', prompt);

  const proc = spawn(cliPath, args, { timeout, env, cwd: '/tmp', stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrBuffer = '';
  proc.stderr?.on('data', (d: Buffer) => { stderrBuffer += d.toString(); });

  const rl = createInterface({ input: proc.stdout!, crlfDelay: Infinity });
  let capturedSessionId = sessionId ?? '';

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      if (line.trim()) console.log(`[PROVIDER:opencode] NON_JSON: ${line.slice(0,200)}`);
      continue;
    }

    const eventType = parsed.type as string;
    const part = parsed.part as Record<string, unknown> | undefined;
    console.log(`[PROVIDER:opencode] EVENT: type=${eventType} partType=${part?.type}`);

    // Capture session ID from step_start
    if (eventType === 'step_start' && !capturedSessionId) {
      capturedSessionId = (parsed.sessionID as string) || '';
    }

    if (eventType === 'step_start') {
      yield { type: 'start', agentId, timestamp: Date.now(), messageId: (part?.messageID as string) ?? '' };
    } else if (eventType === 'reasoning') {
      yield { type: 'thinking_delta', agentId, thinking: (part?.text as string) ?? '' };
    } else if (eventType === 'text') {
      yield { type: 'delta', agentId, text: (part?.text as string) ?? '' };
    } else if (eventType === 'step_finish') {
      const tokens = (parsed as Record<string, unknown>).tokens as Record<string, number> | undefined;
      const cost = (parsed as Record<string, unknown>).cost as number | undefined;
      const reason = (parsed as Record<string, unknown>).reason as string | undefined;
      // Only emit 'end' when the agent has finished responding (not after tool calls)
      if (reason === 'stop' || reason === 'nostop') {
        yield {
          type: 'end',
          agentId,
          duration_ms: Date.now() - start,
          total_cost_usd: cost ?? 0,
          input_tokens: tokens?.input ?? 0,
          output_tokens: tokens?.output ?? 0,
          sessionId: capturedSessionId,
        };
      }
      // For 'tool-calls': continue waiting for subsequent steps (tool results + final text)
    } else if (eventType === 'error' || (part?.type === 'error')) {
      yield { type: 'error', agentId, message: (part?.error as string) ?? 'unknown opencode error' };
    }
  }

  await new Promise<void>((resolve) => {
    proc.on('close', (code) => {
      if (code !== 0 && stderrBuffer.trim()) {
        telemetry('call_error', { agentId, stderr: stderrBuffer.slice(0, 500) });
      } else {
        telemetry('call_end', { agentId, duration_ms: Date.now() - start, sessionId: capturedSessionId });
      }
      resolve();
    });
    proc.on('error', (err) => {
      telemetry('call_error', { agentId, error: err.message });
      resolve();
    });
  });
}
