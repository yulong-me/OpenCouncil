/**
 * F053: Team Evolution PR — persistence, decisions, and merge semantics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockDbRef = vi.hoisted(() => ({
  db: undefined as Database.Database | undefined,
}));

vi.mock('../src/db/db.js', () => ({
  get db() {
    if (!mockDbRef.db) {
      throw new Error('Test DB is not initialized');
    }
    return mockDbRef.db;
  },
  DB_PATH: ':memory:',
}));

vi.mock('../src/db/repositories/agents.js', () => ({
  agentsRepo: {
    list: vi.fn().mockReturnValue([]),
    get: vi.fn(),
  },
}));

let db: Database.Database;

function initTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  const schemaPath = path.resolve(__dirname, '..', 'src', 'db', 'schema.sql');
  testDb.exec(fs.readFileSync(schemaPath, 'utf-8'));
  return testDb;
}

function columnExists(database: Database.Database, table: string, column: string): boolean {
  const info = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return info.some(col => col.name === column);
}

function seedTeamV1(): void {
  db.prepare(`
    INSERT INTO scenes (id, name, description, prompt, builtin, max_a2a_depth)
    VALUES ('software-development', '软件开发', '场景', 'scene prompt', 1, 5)
  `).run();
  db.prepare(`
    INSERT INTO teams (id, name, description, builtin, source_scene_id, active_version_id, created_at, updated_at)
    VALUES ('software-development', '软件开发团队', '团队', 1, 'software-development', 'software-development-v1', 1000, 1000)
  `).run();
  db.prepare(`
    INSERT INTO team_versions (
      id, team_id, version_number, name, description, source_scene_id,
      member_ids_json, member_snapshots_json, workflow_prompt, routing_policy_json,
      team_memory_json, max_a2a_depth, created_at, created_from
    )
    VALUES (
      'software-development-v1', 'software-development', 1, '软件开发团队', '团队', 'software-development',
      '["dev-architect"]',
      '[{"id":"dev-architect","name":"主架构师","roleLabel":"方案设计","provider":"claude-code","providerOpts":{"thinking":true},"systemPrompt":"旧架构 prompt"}]',
      '旧工作流',
      '{"handoff":"loose"}',
      '["已有团队记忆"]',
      5,
      1000,
      'scene-seed'
    )
  `).run();
  db.prepare(`
    INSERT INTO rooms (
      id, topic, state, report, agent_ids, workspace, scene_id, team_id, team_version_id,
      created_at, updated_at, max_a2a_depth
    )
    VALUES (
      'room-1', '实现登录态', 'RUNNING', NULL, '["dev-architect"]', NULL,
      'software-development', 'software-development', 'software-development-v1',
      1100, 1100, NULL
    )
  `).run();
  db.prepare(`
    INSERT INTO messages (id, room_id, agent_role, agent_name, content, timestamp, type)
    VALUES ('msg-1', 'room-1', 'USER', '你', 'Reviewer 没有验证代码，我不满意', 1200, 'user_action')
  `).run();
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  db = initTestDb();
  mockDbRef.db = db;
});

afterEach(() => {
  mockDbRef.db = undefined;
  db.close();
});

describe('F053: schema', () => {
  it('creates evolution proposal tables and validation case storage', () => {
    expect(columnExists(db, 'evolution_proposals', 'base_version_id')).toBe(true);
    expect(columnExists(db, 'evolution_proposal_changes', 'evidence_message_ids_json')).toBe(true);
    expect(columnExists(db, 'team_validation_cases', 'proposal_id')).toBe(true);
  });
});

describe('F053: Team Architect proposal generation', () => {
  it('uses Team Architect output and user feedback instead of fixed change rules', async () => {
    seedTeamV1();
    const { createEvolutionProposalFromRoom } = await import('../src/services/teamEvolution.js');
    const agentClient = {
      generateDraft: vi.fn().mockResolvedValue({
        summary: '根据用户意见，仅沉淀一条团队记忆。',
        changes: [
          {
            kind: 'add-team-memory',
            title: '记住交付前必须验证',
            why: '用户明确反馈 Reviewer 没有验证代码。',
            targetLayer: 'team-memory',
            before: ['已有团队记忆'],
            after: ['交付前必须说明验证命令、结果和无法验证的缺口。'],
            impact: '下一版 Team 会把验证证据作为默认交付要求。',
          },
        ],
      }),
    };

    const proposal = await createEvolutionProposalFromRoom({
      id: 'room-1',
      topic: '实现登录态',
      state: 'RUNNING',
      agents: [],
      messages: [{
        id: 'msg-1',
        agentRole: 'USER',
        agentName: '你',
        content: 'Reviewer 没有验证代码，我不满意',
        timestamp: 1200,
        type: 'user_action',
      }],
      sceneId: 'software-development',
      teamId: 'software-development',
      teamVersionId: 'software-development-v1',
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      maxA2ADepth: null,
      createdAt: 1100,
      updatedAt: 1100,
    }, '只需要记住：交付前必须验证', { agentClient });

    expect(agentClient.generateDraft).toHaveBeenCalledTimes(1);
    expect(agentClient.generateDraft.mock.calls[0]?.[0].schemaName).toBe('TeamEvolutionProposal');
    expect(agentClient.generateDraft.mock.calls[0]?.[0].prompt).toContain('只需要记住：交付前必须验证');
    expect(agentClient.generateDraft.mock.calls[0]?.[0].runtime).toMatchObject({
      timeoutSeconds: null,
    });
    expect(proposal.feedback).toBe('只需要记住：交付前必须验证');
    expect(proposal.changes).toHaveLength(1);
    expect(proposal.changes[0]).toMatchObject({
      kind: 'add-team-memory',
      evidenceMessageIds: ['msg-1'],
    });
  });

  it('rejects invalid Team Architect output without creating a fixed-rule fallback proposal', async () => {
    seedTeamV1();
    const { createEvolutionProposalFromRoom } = await import('../src/services/teamEvolution.js');
    const agentClient = {
      generateDraft: vi.fn().mockResolvedValue({
        summary: '格式不完整',
        changes: [],
      }),
    };

    await expect(createEvolutionProposalFromRoom({
      id: 'room-1',
      topic: '实现登录态',
      state: 'RUNNING',
      agents: [],
      messages: [{
        id: 'msg-1',
        agentRole: 'USER',
        agentName: '你',
        content: 'Reviewer 没有验证代码，我不满意',
        timestamp: 1200,
        type: 'user_action',
      }],
      sceneId: 'software-development',
      teamId: 'software-development',
      teamVersionId: 'software-development-v1',
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      maxA2ADepth: null,
      createdAt: 1100,
      updatedAt: 1100,
    }, '请基于这个问题提改进', { agentClient })).rejects.toMatchObject({
      code: 'EVOLUTION_PROPOSAL_AGENT_FAILED',
    });

    expect(db.prepare('SELECT COUNT(*) as cnt FROM evolution_proposals').get()).toEqual({ cnt: 0 });
  });
});

describe('F054: validation loop schema and repository', () => {
  it('stores validation cases as first-class regression samples', () => {
    expect(columnExists(db, 'team_validation_cases', 'source_room_id')).toBe(true);
    expect(columnExists(db, 'team_validation_cases', 'failure_summary')).toBe(true);
    expect(columnExists(db, 'team_validation_cases', 'input_snapshot_json')).toBe(true);
    expect(columnExists(db, 'team_validation_cases', 'expected_behavior')).toBe(true);
    expect(columnExists(db, 'team_validation_cases', 'assertion_type')).toBe(true);
    expect(columnExists(db, 'team_validation_cases', 'status')).toBe(true);
  });

  it('creates validation cases from accepted add-validation-case changes with source room and expected behavior', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议沉淀验证样例。',
      changes: [
        {
          kind: 'add-validation-case',
          title: '记录 Reviewer 未验证',
          why: '同类失败要能回归检查',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'validation-case',
          before: null,
          after: {
            failureSummary: 'Reviewer 直接说完成，没有验证证据',
            inputSnapshot: { userFeedback: 'Reviewer 没有验证代码，我不满意' },
            expectedBehavior: 'Reviewer 必须给出测试或日志证据',
            assertionType: 'checklist',
          },
          impact: '后续合并前展示并预检',
        },
      ],
    });
    evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'accepted');

    evolutionRepo.runPreflight(proposal.id);
    const result = evolutionRepo.merge(proposal.id, { confirmFailedValidation: true });
    const cases = evolutionRepo.listValidationCasesForProposal(proposal.id);

    expect(result.proposal.status).toBe('applied');
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      teamId: 'software-development',
      sourceRoomId: 'room-1',
      sourceProposalId: proposal.id,
      sourceChangeId: proposal.changes[0].id,
      createdFromChangeId: proposal.changes[0].id,
      failureSummary: 'Reviewer 直接说完成，没有验证证据',
      expectedBehavior: 'Reviewer 必须给出测试或日志证据',
      assertionType: 'checklist',
      status: 'active',
      createdVersionId: result.version?.id,
    });
    expect(cases[0].inputSnapshot).toEqual({ userFeedback: 'Reviewer 没有验证代码，我不满意' });
  });

  it('runs and persists draft preflight results for related validation cases', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        {
          kind: 'add-validation-case',
          title: '记录 Reviewer 未验证',
          why: '同类失败要能回归检查',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'validation-case',
          before: null,
          after: {
            failureSummary: 'Reviewer 未验证',
            inputSnapshot: { prompt: '实现后直接交付' },
            expectedBehavior: '必须给出验证证据',
            assertionType: 'checklist',
          },
          impact: '新增回归样例',
        },
        {
          kind: 'edit-team-workflow',
          title: '工作流补验证证据',
          why: 'Reviewer 缺证据',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'workflow',
          before: '旧工作流',
          after: '新工作流：交付前必须给出验证证据',
          impact: '预检应通过',
        },
      ],
    });
    for (const change of proposal.changes) {
      evolutionRepo.setChangeDecision(proposal.id, change.id, 'accepted');
    }

    const preflight = evolutionRepo.runPreflight(proposal.id);
    const refreshed = evolutionRepo.get(proposal.id);

    expect(preflight.summary).toEqual({ pass: 1, fail: 0, needsReview: 0 });
    expect(preflight.results[0]).toMatchObject({
      proposalId: proposal.id,
      targetVersionId: 'software-development-v2',
      result: 'pass',
    });
    expect(refreshed?.validationPreflight?.summary).toEqual(preflight.summary);
  });

  it('does not block merging when an old preflight report has failed cases', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议但未覆盖验证。',
      changes: [
        {
          kind: 'add-validation-case',
          title: '记录缺少测试',
          why: '需要检查',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'validation-case',
          before: null,
          after: {
            failureSummary: '没有运行测试',
            inputSnapshot: { prompt: '完成实现' },
            expectedBehavior: '必须运行测试',
            assertionType: 'checklist',
          },
          impact: '新增回归样例',
        },
        {
          kind: 'edit-team-workflow',
          title: '只调整措辞',
          why: '未覆盖测试',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'workflow',
          before: '旧工作流',
          after: '新工作流：交付前总结改动',
          impact: '预检应失败',
        },
      ],
    });
    for (const change of proposal.changes) {
      evolutionRepo.setChangeDecision(proposal.id, change.id, 'accepted');
    }

    const preflight = evolutionRepo.runPreflight(proposal.id);
    expect(preflight.summary.fail).toBe(1);

    const result = evolutionRepo.merge(proposal.id);
    expect(result.proposal.status).toBe('applied');
  });

  it('merges accepted changes without requiring validation preflight', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议新增验证样例。',
      changes: [
        {
          kind: 'add-validation-case',
          title: '记录缺少测试',
          why: '需要检查',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'validation-case',
          before: null,
          after: {
            failureSummary: '没有运行测试',
            inputSnapshot: { prompt: '完成实现' },
            expectedBehavior: '必须运行测试',
            assertionType: 'checklist',
          },
          impact: '新增回归样例',
        },
      ],
    });
    evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'accepted');

    const result = evolutionRepo.merge(proposal.id);

    expect(result.proposal.status).toBe('applied');
    expect(result.version).toMatchObject({
      id: 'software-development-v2',
      versionNumber: 2,
    });
  });

  it('refuses to rerun preflight for an applied proposal and preserves historical evidence', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        {
          kind: 'add-validation-case',
          title: '记录 Reviewer 未验证',
          why: '同类失败要能回归检查',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'validation-case',
          before: null,
          after: {
            failureSummary: 'Reviewer 未验证',
            inputSnapshot: { prompt: '实现后直接交付' },
            expectedBehavior: '必须给出验证证据',
            assertionType: 'checklist',
          },
          impact: '新增回归样例',
        },
        {
          kind: 'edit-team-workflow',
          title: '工作流补验证证据',
          why: 'Reviewer 缺证据',
          evidenceMessageIds: ['msg-1'],
          targetLayer: 'workflow',
          before: '旧工作流',
          after: '新工作流：交付前必须给出验证证据',
          impact: '预检应通过',
        },
      ],
    });
    for (const change of proposal.changes) {
      evolutionRepo.setChangeDecision(proposal.id, change.id, 'accepted');
    }
    evolutionRepo.runPreflight(proposal.id);
    const beforeRows = db.prepare('SELECT * FROM team_validation_preflight_results WHERE proposal_id = ? ORDER BY id')
      .all(proposal.id);
    evolutionRepo.merge(proposal.id);

    expect(() => evolutionRepo.runPreflight(proposal.id)).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_PROPOSAL_STATE_CONFLICT' }),
    );
    const afterRows = db.prepare('SELECT * FROM team_validation_preflight_results WHERE proposal_id = ? ORDER BY id')
      .all(proposal.id);
    expect(afterRows).toEqual(beforeRows);
  });

  it('returns version quality timeline with validation evidence and rollback comparison', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        { kind: 'edit-team-workflow', title: '补验证', why: '缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流：必须给出验证证据', impact: '增强验证' },
        { kind: 'add-validation-case', title: '记录缺验证', why: '需要样例', evidenceMessageIds: ['msg-1'], targetLayer: 'validation-case', before: null, after: { failureSummary: '缺验证', inputSnapshot: { prompt: '交付' }, expectedBehavior: '必须给出验证证据', assertionType: 'checklist' }, impact: '新增样例' },
      ],
    });
    for (const change of proposal.changes) {
      evolutionRepo.setChangeDecision(proposal.id, change.id, 'accepted');
    }
    evolutionRepo.runPreflight(proposal.id);
    const merge = evolutionRepo.merge(proposal.id);

    const timeline = evolutionRepo.getTeamQualityTimeline('software-development');
    expect(timeline[0]).toMatchObject({
      versionId: merge.version?.id,
      sourceProposalId: proposal.id,
      acceptedChangeCount: 2,
      addedValidationCaseCount: 1,
      preflightSummary: { pass: 1, fail: 0, needsReview: 0 },
    });
    expect(timeline[0].rollbackEvidence).toMatchObject({
      comparedToVersionId: merge.version?.id,
      validationCasesAddedAfterThisVersion: 0,
    });
    expect(timeline[1].rollbackEvidence.validationCasesAddedAfterThisVersion).toBe(1);
  });
});

describe('F053: evolutionRepo', () => {
  it('persists all six change kinds with evidence and target layer', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '本次建议加强验证、路由和团队记忆。',
      feedback: 'Reviewer 没有验证代码',
      changes: [
        { kind: 'add-agent', title: '招募验证专家', why: '需要独立验证', evidenceMessageIds: ['msg-1'], targetLayer: 'members', before: null, after: { id: 'dev-validator', name: '验证专家', roleLabel: '验证', provider: 'claude-code', providerOpts: {}, systemPrompt: '负责验证' }, impact: '新房间多一名验证成员' },
        { kind: 'edit-agent-prompt', title: '强化 Reviewer prompt', why: 'Reviewer 没有验证', evidenceMessageIds: ['msg-1'], targetLayer: 'member-prompt', before: '旧架构 prompt', after: { agentId: 'dev-architect', systemPrompt: '新架构 prompt，必须验证关键结论' }, impact: '后续新房间会要求验证' },
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流：实现后必须验证', impact: '新版本工作流变化' },
        { kind: 'edit-routing-policy', title: '实现后路由给 Reviewer', why: '路由不严格', evidenceMessageIds: ['msg-1'], targetLayer: 'routing-policy', before: { handoff: 'loose' }, after: { handoff: 'review-required' }, impact: '新版本路由变化' },
        { kind: 'add-team-memory', title: '沉淀验证共识', why: '团队需要记住', evidenceMessageIds: ['msg-1'], targetLayer: 'team-memory', before: [], after: ['交付前必须验证关键路径'], impact: '新版本带团队记忆' },
        { kind: 'add-validation-case', title: '记录失败样例', why: '后续用于 F054', evidenceMessageIds: ['msg-1'], targetLayer: 'validation-case', before: null, after: { title: 'Reviewer 未验证', prompt: '实现后直接交付', expectedOutcome: 'Reviewer 要求验证证据' }, impact: '仅保存样例，不运行门禁' },
      ],
    });

    expect(proposal.status).toBe('pending');
    expect(proposal.changes.map(change => change.kind)).toEqual([
      'add-agent',
      'edit-agent-prompt',
      'edit-team-workflow',
      'edit-routing-policy',
      'add-team-memory',
      'add-validation-case',
    ]);
    expect(proposal.changes.every(change => change.evidenceMessageIds.includes('msg-1'))).toBe(true);
    expect(proposal.changes.every(change => change.targetLayer.length > 0)).toBe(true);
  });

  it('persists per-change decisions and refuses merge until all changes are reviewed', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
        { kind: 'add-team-memory', title: '沉淀共识', why: '需要记住', evidenceMessageIds: ['msg-1'], targetLayer: 'team-memory', before: [], after: ['必须验证'], impact: '增加记忆' },
      ],
    });

    evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'accepted');

    const partiallyReviewed = evolutionRepo.get(proposal.id);
    expect(partiallyReviewed?.changes[0].decision).toBe('accepted');
    expect(() => evolutionRepo.merge(proposal.id)).toThrow(/review every change/i);
  });

  it('classifies missing proposal and change errors for routes', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });

    expect(() => evolutionRepo.setChangeDecision('evo-missing', proposal.changes[0].id, 'accepted')).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_PROPOSAL_NOT_FOUND' }),
    );
    expect(() => evolutionRepo.setChangeDecision(proposal.id, 'change-missing', 'accepted')).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_CHANGE_NOT_FOUND' }),
    );
  });

  it('merges accepted changes into immutable v2 and keeps old room pinned to v1', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');
    const { teamsRepo } = await import('../src/db/repositories/teams.js');
    const { roomsRepo } = await import('../src/db/repositories/rooms.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        { kind: 'edit-agent-prompt', title: '强化 prompt', why: '缺少验证', evidenceMessageIds: ['msg-1'], targetLayer: 'member-prompt', before: '旧架构 prompt', after: { agentId: 'dev-architect', systemPrompt: '新架构 prompt，必须验证关键结论' }, impact: '后续新房间会验证' },
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流：实现后必须验证', impact: '改变工作流' },
        { kind: 'edit-routing-policy', title: '更新路由', why: '路由不严格', evidenceMessageIds: ['msg-1'], targetLayer: 'routing-policy', before: { handoff: 'loose' }, after: { handoff: 'review-required' }, impact: '改变路由' },
        { kind: 'add-team-memory', title: '沉淀共识', why: '需要记住', evidenceMessageIds: ['msg-1'], targetLayer: 'team-memory', before: [], after: ['交付前必须验证关键路径'], impact: '增加记忆' },
        { kind: 'add-validation-case', title: '记录失败样例', why: 'F054 使用', evidenceMessageIds: ['msg-1'], targetLayer: 'validation-case', before: null, after: { title: 'Reviewer 未验证', prompt: '实现后直接交付', expectedOutcome: 'Reviewer 要求验证证据' }, impact: '仅保存样例' },
      ],
    });

    for (const change of proposal.changes) {
      evolutionRepo.setChangeDecision(proposal.id, change.id, 'accepted');
    }

    evolutionRepo.runPreflight(proposal.id);
    const result = evolutionRepo.merge(proposal.id, { confirmFailedValidation: true });
    const team = teamsRepo.get('software-development');
    const v1 = teamsRepo.getVersion('software-development-v1');
    const v2 = teamsRepo.getVersion(result.version!.id);
    const room = roomsRepo.get('room-1');

    expect(result.proposal.status).toBe('applied');
    expect(team?.activeVersionId).toBe(v2?.id);
    expect(v2?.versionNumber).toBe(2);
    expect(v2?.workflowPrompt).toBe('新工作流：实现后必须验证');
    expect(v2?.routingPolicy).toEqual({ handoff: 'review-required' });
    expect(v2?.teamMemory).toEqual(['已有团队记忆', '交付前必须验证关键路径']);
    expect(v2?.memberSnapshots[0].systemPrompt).toBe('新架构 prompt，必须验证关键结论');
    expect(v1?.workflowPrompt).toBe('旧工作流');
    expect(room?.teamVersionId).toBe('software-development-v1');

    const validationCases = db.prepare('SELECT * FROM team_validation_cases').all() as Record<string, unknown>[];
    expect(validationCases).toHaveLength(1);
    expect(validationCases[0].created_version_id).toBe(v2?.id);
  });

  it('marks a proposal rejected without creating a new version when all changes are rejected', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });
    evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'rejected');

    evolutionRepo.runPreflight(proposal.id);
    const result = evolutionRepo.merge(proposal.id);

    expect(result.proposal.status).toBe('rejected');
    expect(result.version).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) as cnt FROM team_versions WHERE version_number = 2').get()).toEqual({ cnt: 0 });
    expect(db.prepare('SELECT active_version_id FROM teams WHERE id = ?').get('software-development')).toEqual({
      active_version_id: 'software-development-v1',
    });
  });

  it('abandons a pending or in-review proposal by marking it rejected without creating a new version', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '用户不满意的提案。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });
    evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'rejected');

    const rejected = evolutionRepo.reject(proposal.id);

    expect(rejected.status).toBe('rejected');
    expect(db.prepare('SELECT COUNT(*) as cnt FROM team_versions WHERE version_number = 2').get()).toEqual({ cnt: 0 });
    expect(db.prepare('SELECT active_version_id FROM teams WHERE id = ?').get('software-development')).toEqual({
      active_version_id: 'software-development-v1',
    });
    expect(() => evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'accepted')).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_PROPOSAL_STATE_CONFLICT' }),
    );
  });

  it('atomically creates a replacement proposal and rejects the old proposal', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');
    const oldProposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '旧提案。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });

    const replacement = evolutionRepo.createReplacing({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '按反馈重新生成。',
      feedback: '请修改 Reviewer prompt',
      changes: [
        { kind: 'edit-agent-prompt', title: '强化 Reviewer 验证', why: 'Reviewer 缺验证证据', evidenceMessageIds: ['msg-1'], targetLayer: 'member-prompt', before: '旧架构 prompt', after: { agentId: 'dev-architect', systemPrompt: '必须验证' }, impact: '要求交付证据' },
      ],
    }, oldProposal.id);

    expect(replacement.status).toBe('pending');
    expect(evolutionRepo.get(oldProposal.id)?.status).toBe('rejected');
  });

  it('does not create a replacement proposal when the old proposal is terminal', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');
    const oldProposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '旧提案。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });
    db.prepare("UPDATE evolution_proposals SET status = 'applied' WHERE id = ?").run(oldProposal.id);

    expect(() => evolutionRepo.createReplacing({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '按反馈重新生成。',
      feedback: '请修改 Reviewer prompt',
      changes: [
        { kind: 'edit-agent-prompt', title: '强化 Reviewer 验证', why: 'Reviewer 缺验证证据', evidenceMessageIds: ['msg-1'], targetLayer: 'member-prompt', before: '旧架构 prompt', after: { agentId: 'dev-architect', systemPrompt: '必须验证' }, impact: '要求交付证据' },
      ],
    }, oldProposal.id)).toThrowError(expect.objectContaining({ code: 'EVOLUTION_PROPOSAL_STATE_CONFLICT' }));
    expect(db.prepare('SELECT COUNT(*) as cnt FROM evolution_proposals').get()).toEqual({ cnt: 1 });
  });

  it('refuses to run preflight for rejected proposals without mutating validation results', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '用户不满意的提案。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });

    evolutionRepo.reject(proposal.id);

    expect(() => evolutionRepo.runPreflight(proposal.id)).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_PROPOSAL_STATE_CONFLICT' }),
    );
    expect(db.prepare('SELECT preflight_checked_at FROM evolution_proposals WHERE id = ?').get(proposal.id)).toEqual({
      preflight_checked_at: null,
    });
    expect(db.prepare('SELECT COUNT(*) as cnt FROM team_validation_preflight_results WHERE proposal_id = ?').get(proposal.id)).toEqual({
      cnt: 0,
    });
  });

  it('classifies duplicate merge and target version conflicts', async () => {
    seedTeamV1();
    const { evolutionRepo } = await import('../src/db/repositories/teamEvolution.js');

    const proposal = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '建议强化验证。',
      changes: [
        { kind: 'edit-team-workflow', title: '增加验证阶段', why: '流程缺验证', evidenceMessageIds: ['msg-1'], targetLayer: 'workflow', before: '旧工作流', after: '新工作流', impact: '改变工作流' },
      ],
    });
    evolutionRepo.setChangeDecision(proposal.id, proposal.changes[0].id, 'accepted');

    evolutionRepo.runPreflight(proposal.id);
    const firstMerge = evolutionRepo.merge(proposal.id);
    expect(firstMerge.proposal.status).toBe('applied');

    expect(() => evolutionRepo.merge(proposal.id)).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_PROPOSAL_STATE_CONFLICT' }),
    );

    const conflicting = evolutionRepo.create({
      roomId: 'room-1',
      teamId: 'software-development',
      baseVersionId: 'software-development-v1',
      targetVersionNumber: 2,
      summary: '另一个并发建议。',
      changes: [
        { kind: 'add-team-memory', title: '沉淀共识', why: '需要记住', evidenceMessageIds: ['msg-1'], targetLayer: 'team-memory', before: [], after: ['必须验证'], impact: '增加记忆' },
      ],
    });
    evolutionRepo.setChangeDecision(conflicting.id, conflicting.changes[0].id, 'accepted');

    evolutionRepo.runPreflight(conflicting.id);
    expect(() => evolutionRepo.merge(conflicting.id)).toThrowError(
      expect.objectContaining({ code: 'EVOLUTION_TARGET_VERSION_EXISTS' }),
    );
  });
});
