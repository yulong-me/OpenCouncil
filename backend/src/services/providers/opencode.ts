import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { ClaudeEvent } from './index.js';

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
  const timeout = (opts.timeout as number) ?? 90000;
  const model = opts.model as string | undefined;
  const thinking = opts.thinking !== false; // default true

  telemetry('call_start', { agentId, promptLength: prompt.length, timeout, model, thinking });

  const args = ['run', '--format', 'json', '--', prompt];
  if (thinking) args.splice(2, 0, '--thinking');
  if (model) { args.splice(1, 0, '--model', model); }

  const proc = spawn('opencode', args, { timeout, stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrBuffer = '';
  proc.stderr?.on('data', (d: Buffer) => { stderrBuffer += d.toString(); });

  const rl = createInterface({ input: proc.stdout!, crlfDelay: Infinity });

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const eventType = parsed.type as string;
    const part = parsed.part as Record<string, unknown> | undefined;

    if (eventType === 'step_start') {
      const messageID = part?.messageID as string | undefined;
      yield { type: 'start', agentId, timestamp: Date.now(), messageId: messageID ?? '' };
    } else if (eventType === 'reasoning') {
      const text = (part?.text as string) ?? '';
      yield { type: 'thinking_delta', agentId, thinking: text };
    } else if (eventType === 'text') {
      const text = (part?.text as string) ?? '';
      yield { type: 'delta', agentId, text };
    } else if (eventType === 'step_finish') {
      const tokens = part?.tokens as Record<string, number> | undefined;
      const cost = part?.cost as number | undefined;
      yield {
        type: 'end',
        agentId,
        duration_ms: Date.now() - start,
        total_cost_usd: cost ?? 0,
        input_tokens: tokens?.input ?? 0,
        output_tokens: tokens?.output ?? 0,
      };
    } else if (eventType === 'error' || (part?.type === 'error')) {
      const errorMsg = (part?.error as string) ?? 'unknown opencode error';
      yield { type: 'error', agentId, message: errorMsg };
    }
  }

  await new Promise<void>((resolve) => {
    proc.on('close', (code) => {
      if (code !== 0 && stderrBuffer.trim()) {
        telemetry('call_error', { agentId, stderr: stderrBuffer.slice(0, 500) });
      } else {
        telemetry('call_end', { agentId, duration_ms: Date.now() - start });
      }
      resolve();
    });
    proc.on('error', (err) => {
      telemetry('call_error', { agentId, error: err.message });
      resolve();
    });
  });
}
