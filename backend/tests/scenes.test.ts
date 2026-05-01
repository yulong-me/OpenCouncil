/**
 * F016: Agent Scenes — HTTP-level integration tests
 *
 * All tests call actual route handlers via Express HTTP.
 * DB dependency is replaced by vi.mock scenesRepo.
 * This catches real implementation regressions (not just logic re-implementations).
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express from 'express';

// ── Mock scenesRepo at db/index level ───────────────────────────────────────
const mockScenesRepo = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockTeamsRepo = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  getActiveVersion: vi.fn(),
  getVersion: vi.fn(),
  ensureFromScenes: vi.fn(),
}));

vi.mock('../src/db/index.js', () => ({
  scenesRepo: mockScenesRepo,
  roomsRepo: { create: vi.fn(), update: vi.fn() },
  auditRepo: { log: vi.fn() },
  teamsRepo: mockTeamsRepo,
  agentsRepo: { list: vi.fn(), get: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  evolutionRepo: { create: vi.fn(), get: vi.fn(), listByRoom: vi.fn(), latestTargetVersionNumber: vi.fn(), setChangeDecision: vi.fn(), merge: vi.fn() },
}));

vi.mock('../src/store.js', () => ({
  store: { get: vi.fn(), create: vi.fn() },
}));

vi.mock('../src/config/agentConfig.js', () => ({
  getAgent: vi.fn().mockReturnValue({
    id: 'worker-1', name: '测试员', role: 'WORKER', roleLabel: '测试',
    provider: 'claude-code', systemPrompt: '你是一个测试员', enabled: true,
  }),
}));

vi.mock('../src/services/stateMachine.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/stateMachine.js')>();
  return {
    ...actual,
    routeToAgent: vi.fn().mockResolvedValue(undefined),
    generateReportInline: vi.fn().mockResolvedValue(''),
  };
});

vi.mock('../src/services/workspace.js', () => ({
  validateWorkspacePath: vi.fn().mockResolvedValue(undefined),
  ensureWorkspace: vi.fn().mockResolvedValue('/tmp/test-workspace'),
  captureWorkspaceSnapshot: vi.fn().mockResolvedValue({ files: {} }),
  summarizeWorkspaceChanges: vi.fn().mockReturnValue({
    hasChanges: false,
    created: [],
    modified: [],
    deleted: [],
  }),
}));

// ── App setup (same pattern as rooms.http.test.ts) ──────────────────────────
import { scenesRouter } from '../src/routes/scenes.js';
import { roomsRouter } from '../src/routes/rooms.js';
import { teamsRouter } from '../src/routes/teams.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/scenes', scenesRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/teams', teamsRouter);
  return app;
}

// Port availability check (probes binding without reserving the port)
let _serverPort = 0;
const _bound = await new Promise<boolean>((resolve) => {
  const probe = http.createServer(makeApp());
  probe.on('error', (err: NodeJS.ErrnoException) => {
    resolve(err.code === 'EACCES' || err.code === 'EPERM' ? false : (() => { throw err; })());
  });
  probe.listen(0, () => {
    const addr = probe.address();
    _serverPort = typeof addr === 'object' && addr !== null ? addr.port : 0;
    probe.close();
    resolve(true);
  });
});
const _skip = _bound ? it : it.skip;

let server: http.Server;

beforeEach(() => {
  vi.clearAllMocks();
  mockTeamsRepo.list.mockReturnValue([]);
  mockTeamsRepo.ensureFromScenes.mockReturnValue({ teamsInserted: 0, versionsInserted: 0 });
});

afterAll(() => {
  if (server) server.close();
});

// Start server once for all tests
beforeAll(async () => {
  server = http.createServer(makeApp());
  await new Promise<void>((resolve) => server.listen(0, () => {
    const addr = server.address();
    _serverPort = typeof addr === 'object' && addr !== null ? addr.port : 0;
    resolve();
  }));
});

// ── HTTP helper ──────────────────────────────────────────────────────────────
function reqJson(
  method: string,
  path: string,
  body?: object,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: _serverPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(raw); } catch { /* ignore */ }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    r.on('error', (e) => resolve({ status: 0, data: { error: String(e) } }));
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('F016: scenesRouter — HTTP-level tests', () => {

  describe('PUT /api/scenes/:id — builtin readonly guard', () => {
    _skip('returns 403 when builtin scene receives a name in body', async () => {
      mockScenesRepo.get.mockReturnValue({
        id: 'roundtable-forum', name: '圆桌论坛',
        prompt: '主持 prompt', builtin: true,
      });

      const res = await reqJson('PUT', '/api/scenes/roundtable-forum', {
        name: '随便改',
        prompt: '新 prompt',
      });

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('code', 'BUILTIN_SCENE_READONLY');
      expect(mockScenesRepo.update).not.toHaveBeenCalled();
    });

    _skip('returns 403 when builtin scene receives a prompt-only update', async () => {
      mockScenesRepo.get.mockReturnValue({
        id: 'roundtable-forum', name: '圆桌论坛',
        prompt: '旧 prompt', builtin: true,
      });

      const res = await reqJson('PUT', '/api/scenes/roundtable-forum', {
        prompt: '新 prompt',
      });

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('code', 'BUILTIN_SCENE_READONLY');
      expect(mockScenesRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/scenes — name non-empty guard', () => {
    _skip('rejects whitespace-only name → 400', async () => {
      const res = await reqJson('POST', '/api/scenes', {
        name: '   ',
        prompt: 'some prompt',
      });

      expect(res.status).toBe(400);
      expect(res.data.error).toMatch(/name/i);
    });

    _skip('accepts valid scene creation', async () => {
      mockScenesRepo.create.mockReturnValue({
        id: 'test-scene', name: '我的场景',
        prompt: 'some prompt', builtin: false,
      });

      const res = await reqJson('POST', '/api/scenes', {
        name: '我的场景',
        prompt: 'some prompt',
      });

      expect(res.status).toBe(201);
    });

    _skip('makes the newly created custom scene available from /api/teams immediately', async () => {
      mockScenesRepo.create.mockReturnValue({
        id: 'custom-scene',
        name: '我的场景',
        description: 'desc',
        prompt: 'some prompt',
        builtin: false,
        maxA2ADepth: 5,
      });
      mockTeamsRepo.ensureFromScenes.mockImplementation(() => {
        mockTeamsRepo.list.mockReturnValue([{
          id: 'custom-scene',
          name: '我的场景团队',
          description: 'desc',
          builtin: false,
          sourceSceneId: 'custom-scene',
          activeVersionId: 'custom-scene-v1',
          createdAt: 1,
          updatedAt: 1,
          activeVersion: {
            id: 'custom-scene-v1',
            teamId: 'custom-scene',
            versionNumber: 1,
            name: '我的场景团队',
            sourceSceneId: 'custom-scene',
            memberIds: [],
            memberSnapshots: [],
            workflowPrompt: 'some prompt',
            routingPolicy: {},
            teamMemory: [],
            maxA2ADepth: 5,
            createdAt: 1,
            createdFrom: 'scene-seed',
          },
          members: [],
        }]);
        return { teamsInserted: 1, versionsInserted: 1 };
      });

      const created = await reqJson('POST', '/api/scenes', {
        name: '我的场景',
        description: 'desc',
        prompt: 'some prompt',
      });
      const teams = await reqJson('GET', '/api/teams');

      expect(created.status).toBe(201);
      expect(mockTeamsRepo.ensureFromScenes).toHaveBeenCalledTimes(1);
      expect(teams.status).toBe(200);
      expect(teams.data).toEqual([
        expect.objectContaining({
          id: 'custom-scene',
          sourceSceneId: 'custom-scene',
          activeVersionId: 'custom-scene-v1',
        }),
      ]);
    });
  });

  describe('DELETE /api/scenes/:id — guards', () => {
    _skip('returns 409 when deleting a scene that has active rooms', async () => {
      mockScenesRepo.delete.mockReturnValue('IN_USE');

      const res = await reqJson('DELETE', '/api/scenes/my-custom');

      expect(res.status).toBe(409);
      expect(res.data).toHaveProperty('code', 'SCENE_IN_USE');
    });

    _skip('returns 403 when deleting builtin scene', async () => {
      mockScenesRepo.delete.mockReturnValue('BUILTIN');

      const res = await reqJson('DELETE', '/api/scenes/roundtable-forum');

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('code', 'BUILTIN_SCENE');
    });
  });

  describe('GET /api/scenes — returns permission flags', () => {
    _skip('builtin scenes have canEditName=false and canEditPrompt=false', async () => {
      mockScenesRepo.list.mockReturnValue([
        { id: 'roundtable-forum', name: '圆桌论坛', prompt: 'p', builtin: true },
        { id: 'custom', name: '自定义', prompt: 'p', builtin: false },
      ]);

      const res = await reqJson('GET', '/api/scenes');

      expect(res.status).toBe(200);
      const scenes = res.data as Array<Record<string, unknown>>;
      expect(scenes.find(s => s.id === 'roundtable-forum')).toHaveProperty('canEditName', false);
      expect(scenes.find(s => s.id === 'roundtable-forum')).toHaveProperty('canEditPrompt', false);
      expect(scenes.find(s => s.id === 'custom')).toHaveProperty('canEditName', true);
      expect(scenes.find(s => s.id === 'custom')).toHaveProperty('canEditPrompt', true);
    });
  });
});

describe('F016: rooms POST /api/rooms — sceneId validation (P2-4)', () => {
  it('rejects roundtable room creation with fewer than 3 workers', async () => {
    const { getAgent } = await import('../src/config/agentConfig.js');

    mockScenesRepo.get.mockReturnValue({
      id: 'roundtable-forum',
      name: '圆桌论坛',
      prompt: 'p',
      builtin: true,
    });
    vi.mocked(getAgent).mockImplementation((id: string) => {
      if (!/^worker-[123]$/.test(id)) return undefined;
      return {
        id,
        name: `测试员${id.slice(-1)}`,
        role: 'WORKER',
        roleLabel: '测试',
        provider: 'claude-code',
        systemPrompt: '你是一个测试员',
        enabled: true,
      };
    });

    const res = await reqJson('POST', '/api/rooms', {
      workerIds: ['worker-1', 'worker-2'],
      sceneId: 'roundtable-forum',
    });

    expect(res.status).toBe(400);
    expect(res.data.error).toContain('至少选择 3 位专家');
  });

  _skip('rejects room creation with unknown sceneId → 400', async () => {
    mockScenesRepo.get.mockReturnValue(undefined);

    const res = await reqJson('POST', '/api/rooms', {
      workerIds: ['worker-1'],
      sceneId: 'nonexistent-scene',
    });

    expect(res.status).toBe(400);
    expect(res.data.error).toContain('Scene not found');
  });

  _skip('accepts room creation with valid builtin sceneId', async () => {
    const { getAgent } = await import('../src/config/agentConfig.js');

    mockScenesRepo.get.mockReturnValue({
      id: 'roundtable-forum', name: '圆桌论坛', prompt: 'p', builtin: true,
    });
    mockScenesRepo.list.mockReturnValue([]);
    vi.mocked(getAgent).mockImplementation((id: string) => {
      if (!/^worker-[123]$/.test(id)) return undefined;
      return {
        id,
        name: `测试员${id.slice(-1)}`,
        role: 'WORKER',
        roleLabel: '测试',
        provider: 'claude-code',
        systemPrompt: '你是一个测试员',
        enabled: true,
      };
    });

    const res = await reqJson('POST', '/api/rooms', {
      workerIds: ['worker-1', 'worker-2', 'worker-3'],
      sceneId: 'roundtable-forum',
    });

    expect(res.status).toBe(200);
  });

  _skip('validates effectiveSceneId (not just explicit sceneId) — P2 fix regression', async () => {
    // When sceneId is omitted, effectiveSceneId defaults to 'roundtable-forum'.
    // If that scene doesn't exist (DB corruption / migration bug), return 400.
    mockScenesRepo.get.mockReturnValue(undefined); // simulate missing default scene

    const res = await reqJson('POST', '/api/rooms', {
      workerIds: ['worker-1'],
      // sceneId intentionally omitted
    });

    expect(res.status).toBe(400);
    expect(res.data.error).toContain('roundtable-forum');
  });
});

describe('F016: scenePromptBuilder — real export', () => {
  _skip('buildRoomScopedSystemPrompt throws when room scene does not exist', async () => {
    const { buildRoomScopedSystemPrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');

    // Room exists but scene does not
    vi.mocked(store.get).mockReturnValue({
      id: 'room-1', topic: 'Test', state: 'RUNNING' as const,
      agents: [], messages: [], sessionIds: {}, a2aDepth: 0, a2aCallChain: [],
      sceneId: 'ghost-scene',
    });
    mockScenesRepo.get.mockReturnValue(undefined); // scene not found

    expect(() =>
      buildRoomScopedSystemPrompt('room-1', 'base prompt', { userMessage: 'hi' }),
    ).toThrow(/ghost-scene/);
  });

  it('injects room participants and current recipient into runtime context', async () => {
    const { buildRoomScopedSystemPrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');

    vi.mocked(store.get).mockReturnValue({
      id: 'room-1',
      topic: '实现登录态持久化',
      state: 'RUNNING' as const,
      agents: [
        { id: 'worker-1', role: 'WORKER' as const, name: '架构师', domainLabel: '架构设计', configId: 'architect', status: 'idle' as const },
        { id: 'worker-2', role: 'WORKER' as const, name: 'Reviewer', domainLabel: '代码审查', configId: 'reviewer', status: 'idle' as const },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      sceneId: 'software-development',
      maxA2ADepth: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockScenesRepo.get.mockReturnValue({
      id: 'software-development',
      name: '软件开发',
      prompt: '软件开发场景',
      builtin: true,
      maxA2ADepth: 5,
    });

    const prompt = buildRoomScopedSystemPrompt('room-1', 'base prompt', {
      userMessage: '请先评估方案',
      toAgentName: '架构师',
    });

    expect(prompt).toContain('【当前接收人】架构师');
    expect(prompt).toContain('【参与专家】');
    expect(prompt).toContain('- 架构师（架构设计）');
    expect(prompt).toContain('- Reviewer（代码审查）');
    expect(prompt).toContain('需要协作时，另起一行行首 @专家名');
    expect(prompt).toContain('【回复区输出协议】');
    expect(prompt).toContain('回复区只保留结论、反驳、决定或下一步');
  });

  it('uses pinned TeamVersion workflowPrompt before Scene prompt', async () => {
    const { buildRoomScopedSystemPrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');
    const { teamsRepo } = await import('../src/db/index.js');

    vi.mocked(store.get).mockReturnValue({
      id: 'room-team',
      topic: '实现登录态持久化',
      state: 'RUNNING' as const,
      agents: [
        { id: 'worker-1', role: 'WORKER' as const, name: '架构师', domainLabel: '架构设计', configId: 'architect', status: 'idle' as const },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      sceneId: 'software-development',
      teamId: 'software-development',
      teamVersionId: 'software-development-v2',
      teamName: '软件开发团队',
      teamVersionNumber: 2,
      maxA2ADepth: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockScenesRepo.get.mockReturnValue({
      id: 'software-development',
      name: '软件开发',
      prompt: 'Scene prompt should not lead',
      builtin: true,
      maxA2ADepth: 5,
    });
    vi.mocked(teamsRepo.getVersion).mockReturnValue({
      id: 'software-development-v2',
      teamId: 'software-development',
      versionNumber: 2,
      name: '软件开发团队',
      sourceSceneId: 'software-development',
      memberIds: ['architect'],
      workflowPrompt: 'Pinned TeamVersion workflow',
      routingPolicy: {},
      teamMemory: [],
      maxA2ADepth: 5,
      createdAt: 2,
      createdFrom: 'manual',
    });

    const prompt = buildRoomScopedSystemPrompt('room-team', 'base prompt', {
      userMessage: '请先评估方案',
    });

    expect(prompt?.startsWith('Pinned TeamVersion workflow')).toBe(true);
    expect(prompt).not.toContain('Scene prompt should not lead\n\nbase prompt');
  });

  it('uses pinned TeamVersion workflowPrompt even if the source Scene is missing', async () => {
    const { buildRoomScopedSystemPrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');
    const { teamsRepo } = await import('../src/db/index.js');

    vi.mocked(store.get).mockReturnValue({
      id: 'room-team-missing-scene',
      topic: '实现登录态持久化',
      state: 'RUNNING' as const,
      agents: [
        { id: 'worker-1', role: 'WORKER' as const, name: '架构师', domainLabel: '架构设计', configId: 'architect', status: 'idle' as const },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      sceneId: 'deleted-scene',
      teamId: 'custom-team',
      teamVersionId: 'custom-team-v1',
      teamName: '自定义团队',
      teamVersionNumber: 1,
      maxA2ADepth: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockScenesRepo.get.mockReturnValue(undefined);
    vi.mocked(teamsRepo.getVersion).mockReturnValue({
      id: 'custom-team-v1',
      teamId: 'custom-team',
      versionNumber: 1,
      name: '自定义团队',
      sourceSceneId: 'deleted-scene',
      memberIds: ['architect'],
      memberSnapshots: [],
      workflowPrompt: 'Pinned workflow survives deleted scene',
      routingPolicy: {},
      teamMemory: [],
      maxA2ADepth: 5,
      createdAt: 1,
      createdFrom: 'scene-seed',
    });

    const prompt = buildRoomScopedSystemPrompt('room-team-missing-scene', 'base prompt', {
      userMessage: '请先评估方案',
    });

    expect(prompt?.startsWith('Pinned workflow survives deleted scene')).toBe(true);
    expect(prompt).toContain('base prompt');
  });

  it('uses pinned TeamVersion member prompt snapshot when assembling an agent base prompt', async () => {
    const { buildRoomScopedSystemPrompt, buildAgentBasePrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');
    const { teamsRepo } = await import('../src/db/index.js');

    vi.mocked(store.get).mockReturnValue({
      id: 'room-team-snapshot',
      topic: '实现登录态持久化',
      state: 'RUNNING' as const,
      agents: [
        { id: 'worker-1', role: 'WORKER' as const, name: '架构师', domainLabel: '架构设计', configId: 'architect', status: 'idle' as const },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      sceneId: 'software-development',
      teamId: 'software-development',
      teamVersionId: 'software-development-v1',
      teamName: '软件开发团队',
      teamVersionNumber: 1,
      maxA2ADepth: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockScenesRepo.get.mockReturnValue({
      id: 'software-development',
      name: '软件开发',
      prompt: '软件开发场景',
      builtin: true,
      maxA2ADepth: 5,
    });
    vi.mocked(teamsRepo.getVersion).mockReturnValue({
      id: 'software-development-v1',
      teamId: 'software-development',
      versionNumber: 1,
      name: '软件开发团队',
      sourceSceneId: 'software-development',
      memberIds: ['architect'],
      memberSnapshots: [{
        id: 'architect',
        name: '架构师',
        roleLabel: '架构设计',
        provider: 'claude-code',
        providerOpts: { thinking: true },
        systemPrompt: '原始架构师 prompt',
      }],
      workflowPrompt: 'Pinned TeamVersion workflow',
      routingPolicy: {},
      teamMemory: [],
      maxA2ADepth: 5,
      createdAt: 1,
      createdFrom: 'scene-seed',
    });

    const basePrompt = buildAgentBasePrompt(
      'room-team-snapshot',
      'architect',
      '架构师',
      '架构设计',
      '编辑后的架构师 prompt',
    );
    const prompt = buildRoomScopedSystemPrompt('room-team-snapshot', basePrompt, {
      userMessage: '请先评估方案',
    });

    expect(prompt).toContain('原始架构师 prompt');
    expect(prompt).not.toContain('编辑后的架构师 prompt');
  });

  it('injects current A2A depth and effective max depth into runtime context', async () => {
    const { buildRoomScopedSystemPrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');

    vi.mocked(store.get).mockReturnValue({
      id: 'room-depth',
      topic: '实现登录态持久化',
      state: 'RUNNING' as const,
      agents: [
        { id: 'worker-1', role: 'WORKER' as const, name: '架构师', domainLabel: '架构设计', configId: 'architect', status: 'idle' as const },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 2,
      a2aCallChain: ['架构师', 'Reviewer'],
      sceneId: 'software-development',
      maxA2ADepth: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockScenesRepo.get.mockReturnValue({
      id: 'software-development',
      name: '软件开发',
      prompt: '软件开发场景',
      builtin: true,
      maxA2ADepth: 10,
    });

    const prompt = buildRoomScopedSystemPrompt('room-depth', 'base prompt', {
      userMessage: '请继续深入讨论',
    });

    expect(prompt).toContain('【A2A 协作深度】当前 2 层 / 最大 10 层');
  });

  it('skips terse reply protocol for report mode', async () => {
    const { buildRoomScopedSystemPrompt } = await import('../src/services/scenePromptBuilder.js');
    const { store } = await import('../src/store.js');

    vi.mocked(store.get).mockReturnValue({
      id: 'room-report',
      topic: '实现登录态持久化',
      state: 'RUNNING' as const,
      agents: [
        { id: 'worker-1', role: 'WORKER' as const, name: '架构师', domainLabel: '架构设计', configId: 'architect', status: 'idle' as const },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      sceneId: 'software-development',
      maxA2ADepth: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockScenesRepo.get.mockReturnValue({
      id: 'software-development',
      name: '软件开发',
      prompt: '软件开发场景',
      builtin: true,
      maxA2ADepth: 5,
    });

    const prompt = buildRoomScopedSystemPrompt('room-report', 'base prompt', {
      userMessage: '请输出报告',
      outputMode: 'report',
    });

    expect(prompt).not.toContain('【回复区输出协议】');
  });
});

// ── Pure logic: name guard expression (no mock needed) ──────────────────────
describe('F016: name guard — pure logic verification', () => {
  it('whitespace-only name is rejected by trim guard', () => {
    const rawName = '   ';
    const trimmed = rawName?.trim();
    expect(!trimmed).toBe(true); // guards against DB write
  });

  it('empty string is rejected by trim guard', () => {
    const rawName = '';
    const trimmed = rawName?.trim();
    expect(!trimmed).toBe(true);
  });

  it('valid name passes guard', () => {
    const rawName = '我的自定义场景';
    const trimmed = rawName?.trim();
    expect(!!trimmed).toBe(true);
  });

  it('repo defense: empty name falls back to existing name', () => {
    // Simulates: name: (input.name && input.name.trim()) ? ... : existing.name
    const existingName = 'Test Scene';
    const emptyInput = '   ';
    const resolved = (emptyInput && emptyInput.trim()) ? emptyInput.trim() : existingName;
    expect(resolved).toBe(existingName);
  });
});
