import { db } from '../db.js';
import { agentsRepo } from './agents.js';
import { v4 as uuid } from 'uuid';
import type {
  TeamConfig,
  TeamDraft,
  TeamDraftMember,
  TeamDraftValidationCase,
  TeamListItem,
  TeamVersionConfig,
  TeamVersionMemberSnapshot,
  ValidationCase,
} from '../../types.js';

export type TeamRepoErrorCode = 'TEAM_GOAL_TOO_VAGUE' | 'TEAM_DRAFT_INVALID';

export class TeamRepoError extends Error {
  code: TeamRepoErrorCode;

  constructor(code: TeamRepoErrorCode, message: string) {
    super(message);
    this.name = 'TeamRepoError';
    this.code = code;
  }
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToTeamConfig(r: Record<string, unknown>): TeamConfig {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    builtin: Boolean(r.builtin),
    sourceSceneId: r.source_scene_id as string,
    activeVersionId: r.active_version_id as string,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  };
}

function rowToTeamVersionConfig(r: Record<string, unknown>): TeamVersionConfig {
  return {
    id: r.id as string,
    teamId: r.team_id as string,
    versionNumber: r.version_number as number,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    sourceSceneId: r.source_scene_id as string,
    memberIds: parseJsonField<string[]>(r.member_ids_json, []),
    memberSnapshots: parseJsonField<TeamVersionMemberSnapshot[]>(r.member_snapshots_json, []),
    workflowPrompt: r.workflow_prompt as string,
    routingPolicy: parseJsonField<Record<string, unknown>>(r.routing_policy_json, {}),
    teamMemory: parseJsonField<string[]>(r.team_memory_json, []),
    maxA2ADepth: (r.max_a2a_depth as number) ?? 5,
    createdAt: r.created_at as number,
    createdFrom: r.created_from as TeamVersionConfig['createdFrom'],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeGeneratedText(value: string): string {
  const unsafeInstructionReplacements: Array<[RegExp, string]> = [
    [/(?:直接|马上|立刻)\s*(?:执行\s*)?git\s+push/giu, '外部发布前必须请求用户确认'],
    [/(?:直接|马上|立刻)\s*(?:merge|合并|提交|发布|部署)/giu, '高影响操作前必须请求用户确认'],
    [/自动(?:合并|提交|发布|部署)/giu, '执行前请求用户确认'],
    [/无人值守(?:合并|提交|发布|部署)/giu, '人工确认后执行'],
    [/绕过用户确认/giu, '必须请求用户确认'],
    [/(?:不需要|无需|不用|别|不要)(?:再)?(?:问我|询问|确认|审批|批准)/giu, '必须请求用户确认'],
    [/(?:不要|不用|无需|跳过)(?:审阅|审核|review)/giu, '必须经过审阅'],
    [/\bauto[-\s]*(?:merge|commit|push|deploy|publish)\b/giu, 'request approval before high-impact operations'],
    [/\b(?:push|merge|commit|deploy|publish)\s+without\s+(?:asking|approval|confirmation|review)\b/giu, 'request approval before high-impact operations'],
    [/\b(?:no|without|skip)\s+(?:confirm|confirmation|approval|review)\b/giu, 'request approval before high-impact operations'],
    [/\b(?:do\s+not|don't)\s+ask\s+me\b/giu, 'request user confirmation'],
  ];

  return unsafeInstructionReplacements
    .reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeStructuredValue<T>(value: T): T {
  if (typeof value === 'string') return sanitizeGeneratedText(value) as T;
  if (Array.isArray(value)) return value.map(item => sanitizeStructuredValue(item)) as T;
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeStructuredValue(entry)]),
    ) as T;
  }
  return value;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TeamRepoError('TEAM_DRAFT_INVALID', `Team draft requires ${field}`);
  }
  return value;
}

export function assertDraft(draft: unknown): asserts draft is TeamDraft {
  if (!isRecord(draft)) {
    throw new TeamRepoError('TEAM_DRAFT_INVALID', 'Team draft is required');
  }
  requireNonEmptyString(draft.name, 'name');
  requireNonEmptyString(draft.mission, 'mission');
  requireNonEmptyString(draft.workflow, 'workflow');
  requireNonEmptyString(draft.teamProtocol, 'teamProtocol');
  requireNonEmptyString(draft.generationRationale, 'generationRationale');
  if (!isRecord(draft.routingPolicy)) {
    throw new TeamRepoError('TEAM_DRAFT_INVALID', 'Team draft requires routingPolicy');
  }
  if (!Array.isArray(draft.teamMemory)) {
    throw new TeamRepoError('TEAM_DRAFT_INVALID', 'Team draft requires teamMemory');
  }
  if (!Array.isArray(draft.members) || draft.members.length < 1) {
    throw new TeamRepoError('TEAM_DRAFT_INVALID', 'Team draft requires at least one member');
  }
  for (const member of draft.members) {
    if (!isRecord(member)) {
      throw new TeamRepoError('TEAM_DRAFT_INVALID', 'Team draft member is incomplete: unknown');
    }
    const memberLabel = typeof member.displayName === 'string' && member.displayName.trim()
      ? member.displayName
      : typeof member.role === 'string' && member.role.trim()
        ? member.role
        : 'unknown';
    try {
      requireNonEmptyString(member.displayName, 'member.displayName');
      requireNonEmptyString(member.role, 'member.role');
      requireNonEmptyString(member.responsibility, 'member.responsibility');
      requireNonEmptyString(member.systemPrompt, 'member.systemPrompt');
      requireNonEmptyString(member.whenToUse, 'member.whenToUse');
    } catch {
      throw new TeamRepoError('TEAM_DRAFT_INVALID', `Team draft member is incomplete: ${memberLabel}`);
    }
  }
  if (!Array.isArray(draft.validationCases) || draft.validationCases.length < 1) {
    throw new TeamRepoError('TEAM_DRAFT_INVALID', 'Team draft requires validationCases');
  }
  for (const [index, validationCase] of draft.validationCases.entries()) {
    if (!isRecord(validationCase)) {
      throw new TeamRepoError('TEAM_DRAFT_INVALID', `Team draft validation case is incomplete: ${index + 1}`);
    }
    requireNonEmptyString(validationCase.failureSummary, `validationCases[${index}].failureSummary`);
    if (!('inputSnapshot' in validationCase)) {
      throw new TeamRepoError('TEAM_DRAFT_INVALID', `Team draft requires validationCases[${index}].inputSnapshot`);
    }
    requireNonEmptyString(validationCase.expectedBehavior, `validationCases[${index}].expectedBehavior`);
    if (validationCase.assertionType !== 'checklist' && validationCase.assertionType !== 'replay') {
      throw new TeamRepoError('TEAM_DRAFT_INVALID', `Team draft requires validationCases[${index}].assertionType`);
    }
  }
}

export function sanitizeDraftFromUntrustedSource(draft: unknown): TeamDraft {
  const sanitized = sanitizeStructuredValue(draft);
  assertDraft(sanitized);
  return sanitized;
}

function normalizeGoal(goal: string): string {
  return sanitizeGeneratedText(goal).replace(/\s+/g, ' ').trim();
}

function classifyGoal(goal: string): 'software' | 'research' | 'writing' | 'general' {
  if (/软件|代码|功能|实现|开发|review|测试|验收/i.test(goal)) return 'software';
  if (/研究|调研|竞品|市场|方向|机会|分析/i.test(goal)) return 'research';
  if (/写|文章|文案|稿|博客|内容|审稿/i.test(goal)) return 'writing';
  return 'general';
}

function buildMember(displayName: string, role: string, responsibility: string, whenToUse: string, systemPrompt: string): TeamDraftMember {
  return {
    displayName,
    role,
    responsibility,
    whenToUse,
    systemPrompt: sanitizeGeneratedText(`${systemPrompt} 关键范围变化、不可逆操作和外部发布前必须请求用户确认。`),
    providerPreference: 'claude-code',
  };
}

function buildDraft(goal: string): TeamDraft {
  const kind = classifyGoal(goal);
  if (kind === 'software') {
    return {
      name: '软件交付团队',
      mission: `围绕“${goal}”，从需求澄清、方案设计、实现、review 到验收，交付可验证的软件改动。`,
      members: [
        buildMember('产品澄清员', '需求澄清', '收敛目标、边界和验收标准。', '目标、范围或验收标准不清晰时。', '你负责把用户目标拆成可执行需求、边界和验收标准。'),
        buildMember('架构设计师', '方案设计', '设计实现路径、识别风险和依赖。', '需要改动方案、模块边界或风险判断时。', '你负责提出最小可行方案、风险和验证计划。'),
        buildMember('实现工程师', '实现', '按确认方案修改代码并运行验证。', '方案确认后需要落地代码时。', '你负责实现代码、保持改动聚焦，并记录验证命令和结果。'),
        buildMember('Reviewer', '审查', '检查行为回归、测试缺口和交付证据。', '实现完成后或需要质量把关时。', '你负责以代码 review 视角指出 bug、回归风险和缺失验证。'),
      ],
      workflow: '1. 澄清目标和验收标准\n2. 拆解方案和风险\n3. 实现最小可行改动\n4. Review 行为和回归风险\n5. 修复问题并运行验证\n6. 汇报用户可验证变化、验证命令和剩余风险',
      teamProtocol: '成员交接必须说明 What / Why / Tradeoff / Open Questions / Next Action。范围变化、不可逆操作、外部发布或合并动作必须等待用户确认。',
      routingPolicy: {
        rules: [
          { when: '需求或验收标准不明确', memberRole: '需求澄清' },
          { when: '需要方案和风险判断', memberRole: '方案设计' },
          { when: '需要修改代码或运行验证', memberRole: '实现' },
          { when: '需要质量检查或交付前把关', memberRole: '审查' },
        ],
      },
      teamMemory: ['交付必须包含验证证据。', '先确认边界，再做不可逆操作。'],
      validationCases: [
        {
          title: '需求澄清覆盖',
          failureSummary: '团队在目标不清时直接实现',
          inputSnapshot: { goal },
          expectedBehavior: '目标不清时先提出澄清问题和验收标准',
          assertionType: 'checklist',
        },
        {
          title: '验证证据覆盖',
          failureSummary: '实现完成但没有验证命令或结果',
          inputSnapshot: { goal },
          expectedBehavior: '最终汇报包含验证命令和结果',
          assertionType: 'checklist',
        },
        {
          title: '交付前 review',
          failureSummary: '实现后直接交付，缺少 review',
          inputSnapshot: { goal },
          expectedBehavior: '交付前由 Reviewer 检查回归风险和测试缺口',
          assertionType: 'checklist',
        },
      ],
      generationRationale: '目标包含软件功能交付、实现、review 和验收，因此生成需求、方案、实现和审查四个职责边界清晰的成员。',
    };
  }

  if (kind === 'research') {
    return {
      name: '研究分析团队',
      mission: `围绕“${goal}”，完成资料梳理、判断框架、机会分析和行动建议。`,
      members: [
        buildMember('研究员', '资料梳理', '收集和整理事实材料。', '需要建立事实基础时。', '你负责基于证据梳理事实和来源。'),
        buildMember('分析师', '结构分析', '建立分析框架和关键变量。', '需要判断结构、趋势或机会时。', '你负责拆解变量、假设和判断依据。'),
        buildMember('策略顾问', '行动建议', '把分析转成可执行计划。', '需要结论、路线图或取舍时。', '你负责输出取舍、优先级和下一步行动。'),
      ],
      workflow: '1. 明确研究问题\n2. 梳理事实和证据\n3. 建立分析框架\n4. 形成机会判断\n5. 输出行动计划和验证方式',
      teamProtocol: '结论必须区分事实、推断和建议；高不确定性判断必须标注假设并请求用户确认边界。',
      routingPolicy: { rules: [
        { when: '缺少事实材料', memberRole: '资料梳理' },
        { when: '需要趋势或机会判断', memberRole: '结构分析' },
        { when: '需要落地计划', memberRole: '行动建议' },
      ] },
      teamMemory: ['事实、推断和建议必须分开表达。'],
      validationCases: [
        { title: '事实推断分离', failureSummary: '把推断说成事实', inputSnapshot: { goal }, expectedBehavior: '输出区分事实、推断和建议', assertionType: 'checklist' },
        { title: '行动建议', failureSummary: '只有资料堆叠没有计划', inputSnapshot: { goal }, expectedBehavior: '最终包含明确下一步行动', assertionType: 'checklist' },
      ],
      generationRationale: '目标偏研究分析，因此生成事实、分析和策略三个互补角色。',
    };
  }

  if (kind === 'writing') {
    return {
      name: '内容创作团队',
      mission: `围绕“${goal}”，完成资料整理、结构搭建、正文写作和审稿优化。`,
      members: [
        buildMember('资料编辑', '资料整理', '整理素材和关键信息。', '写作前需要素材时。', '你负责整理素材、事实和可引用要点。'),
        buildMember('主笔', '正文写作', '产出结构和正文。', '需要生成正文时。', '你负责形成清晰结构和正文草稿。'),
        buildMember('审稿人', '审稿优化', '检查逻辑、语气和读者体验。', '草稿完成后。', '你负责指出逻辑断点、表达问题和可删减内容。'),
      ],
      workflow: '1. 明确读者和目标\n2. 梳理素材\n3. 搭建结构\n4. 写正文\n5. 审稿并收敛',
      teamProtocol: '保留用户原意，修改语气或立场前必须请求用户确认。',
      routingPolicy: { rules: [
        { when: '需要素材', memberRole: '资料整理' },
        { when: '需要正文', memberRole: '正文写作' },
        { when: '需要修改质量', memberRole: '审稿优化' },
      ] },
      teamMemory: ['保留用户原意，不擅自扩写立场。'],
      validationCases: [
        { title: '保留原意', failureSummary: '写作偏离用户原意', inputSnapshot: { goal }, expectedBehavior: '修改保留用户原意和目标读者', assertionType: 'checklist' },
        { title: '审稿收敛', failureSummary: '草稿未经过审稿', inputSnapshot: { goal }, expectedBehavior: '最终包含审稿后的收敛版本', assertionType: 'checklist' },
      ],
      generationRationale: '目标偏内容写作，因此生成资料、写作和审稿角色。',
    };
  }

  return {
    name: '目标执行团队',
    mission: `围绕“${goal}”，澄清目标、拆解方案、执行任务并验证结果。`,
    members: [
      buildMember('目标澄清员', '目标澄清', '明确目标、边界和验收标准。', '目标不清或范围变化时。', '你负责澄清目标、边界和成功标准。'),
      buildMember('方案设计师', '方案设计', '拆解任务、识别风险。', '需要执行方案时。', '你负责把目标拆成步骤和验证点。'),
      buildMember('执行者', '执行交付', '完成任务并记录证据。', '方案确认后。', '你负责执行任务并汇报结果证据。'),
    ],
    workflow: '1. 澄清目标\n2. 拆方案\n3. 执行\n4. 验证\n5. 汇报',
    teamProtocol: '不确定或高影响操作必须请求用户确认；交付必须包含结果和验证证据。',
    routingPolicy: { rules: [
      { when: '目标不清', memberRole: '目标澄清' },
      { when: '需要方案', memberRole: '方案设计' },
      { when: '需要执行', memberRole: '执行交付' },
    ] },
    teamMemory: ['先澄清边界，再执行。'],
    validationCases: [
      { title: '目标清晰度', failureSummary: '目标模糊时直接执行', inputSnapshot: { goal }, expectedBehavior: '目标模糊时先请求补充边界和交付物', assertionType: 'checklist' },
      { title: '结果验证', failureSummary: '交付缺少验证证据', inputSnapshot: { goal }, expectedBehavior: '最终汇报包含验证证据', assertionType: 'checklist' },
    ],
    generationRationale: '目标需要从澄清到执行的通用协作链路，因此生成澄清、方案和执行角色。',
  };
}

function createInitialValidationCases(teamId: string, versionId: string, cases: TeamDraftValidationCase[], now: number): ValidationCase[] {
  const created: ValidationCase[] = [];
  for (const validationCase of cases) {
    const id = uuid();
    const failureSummary = sanitizeGeneratedText(validationCase.failureSummary);
    const inputSnapshot = sanitizeStructuredValue(validationCase.inputSnapshot ?? null);
    const expectedBehavior = sanitizeGeneratedText(validationCase.expectedBehavior);
    const assertionType = validationCase.assertionType === 'replay' ? 'replay' : 'checklist';
    db.prepare(`
      INSERT INTO team_validation_cases (
        id, team_id, proposal_id, change_id, source_room_id, base_version_id, created_version_id,
        title, failure_summary, input_snapshot_json, expected_behavior, assertion_type, status,
        prompt, expected_outcome, evidence_message_ids_json, created_at
      )
      VALUES (
        @id, @teamId, NULL, NULL, NULL, NULL, @createdVersionId,
        @title, @failureSummary, @inputSnapshotJson, @expectedBehavior, @assertionType, 'active',
        @prompt, @expectedOutcome, '[]', @createdAt
      )
    `).run({
      id,
      teamId,
      createdVersionId: versionId,
      title: sanitizeGeneratedText(validationCase.title ?? failureSummary),
      failureSummary,
      inputSnapshotJson: JSON.stringify(inputSnapshot),
      expectedBehavior,
      assertionType,
      prompt: typeof inputSnapshot === 'object' ? JSON.stringify(inputSnapshot) : String(inputSnapshot ?? ''),
      expectedOutcome: expectedBehavior,
      createdAt: now,
    });
    created.push({
      id,
      teamId,
      createdVersionId: versionId,
      failureSummary,
      inputSnapshot,
      expectedBehavior,
      assertionType,
      createdFromChangeId: 'team-draft',
      status: 'active',
      evidenceMessageIds: [],
      createdAt: now,
    });
  }
  return created;
}

export const teamsRepo = {
  generateDraftFromGoal(goalInput: string): TeamDraft {
    const goal = normalizeGoal(goalInput ?? '');
    const meaningfulTokens = goal.match(/[\p{Script=Han}A-Za-z0-9]/gu) ?? [];
    const hasActionableVerb = /帮我|做|搭|建|创建|设计|开发|实现|生成|输出|完成|研究|调研|分析|写|整理|优化|制作|构建|create|build|make|design|develop|implement|generate|write|research|analyze/i.test(goal);
    if (meaningfulTokens.length < 6 || !hasActionableVerb) {
      throw new TeamRepoError('TEAM_GOAL_TOO_VAGUE', '请补充目标、交付物和边界后再生成 Team 草案');
    }
    return buildDraft(goal);
  },

  createFromDraft(draft: TeamDraft): { team: TeamConfig; version: TeamVersionConfig; validationCases: ValidationCase[] } {
    assertDraft(draft);
    const now = Date.now();
    const teamId = `team-${uuid()}`;
    const versionId = `${teamId}-v1`;
    const sourceSceneId = db.prepare('SELECT id FROM scenes WHERE id = ?').get('software-development')
      ? 'software-development'
      : db.prepare('SELECT id FROM scenes WHERE id = ?').get('roundtable-forum')
        ? 'roundtable-forum'
        : 'custom-team';
    const memberSnapshots: TeamVersionMemberSnapshot[] = draft.members.map((member, index) => ({
      id: `draft-member-${index + 1}-${uuid().slice(0, 8)}`,
      name: member.displayName.trim(),
      roleLabel: member.role.trim(),
      provider: member.providerPreference ?? 'claude-code',
      providerOpts: {},
      systemPrompt: sanitizeGeneratedText(member.systemPrompt),
      responsibility: member.responsibility.trim(),
      whenToUse: member.whenToUse.trim(),
    }));
    const version: TeamVersionConfig = {
      id: versionId,
      teamId,
      versionNumber: 1,
      name: draft.name.trim(),
      description: sanitizeGeneratedText(draft.mission),
      sourceSceneId,
      memberIds: memberSnapshots.map(member => member.id),
      memberSnapshots,
      workflowPrompt: sanitizeGeneratedText([draft.mission, draft.workflow, draft.teamProtocol].join('\n\n')),
      routingPolicy: sanitizeStructuredValue(draft.routingPolicy),
      teamMemory: draft.teamMemory.map(item => sanitizeGeneratedText(item)).filter(Boolean),
      maxA2ADepth: 5,
      createdAt: now,
      createdFrom: 'manual',
    };

    const insert = db.transaction(() => {
      db.prepare(`
        INSERT INTO teams (id, name, description, builtin, source_scene_id, active_version_id, created_at, updated_at)
        VALUES (@id, @name, @description, 0, @sourceSceneId, @activeVersionId, @createdAt, @updatedAt)
      `).run({
        id: teamId,
        name: draft.name.trim(),
        description: sanitizeGeneratedText(draft.mission),
        sourceSceneId,
        activeVersionId: versionId,
        createdAt: now,
        updatedAt: now,
      });
      db.prepare(`
        INSERT INTO team_versions (
          id, team_id, version_number, name, description, source_scene_id, member_ids_json,
          member_snapshots_json, workflow_prompt, routing_policy_json, team_memory_json,
          max_a2a_depth, created_at, created_from
        )
        VALUES (
          @id, @teamId, @versionNumber, @name, @description, @sourceSceneId, @memberIdsJson,
          @memberSnapshotsJson, @workflowPrompt, @routingPolicyJson, @teamMemoryJson,
          @maxA2ADepth, @createdAt, @createdFrom
        )
      `).run({
        id: version.id,
        teamId: version.teamId,
        versionNumber: version.versionNumber,
        name: version.name,
        description: version.description ?? null,
        sourceSceneId: version.sourceSceneId,
        memberIdsJson: JSON.stringify(version.memberIds),
        memberSnapshotsJson: JSON.stringify(version.memberSnapshots),
        workflowPrompt: version.workflowPrompt,
        routingPolicyJson: JSON.stringify(version.routingPolicy),
        teamMemoryJson: JSON.stringify(version.teamMemory),
        maxA2ADepth: version.maxA2ADepth,
        createdAt: version.createdAt,
        createdFrom: version.createdFrom,
      });
      return createInitialValidationCases(teamId, versionId, draft.validationCases ?? [], now);
    });

    const validationCases = insert();
    return {
      team: rowToTeamConfig(db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as Record<string, unknown>),
      version,
      validationCases,
    };
  },

  list(): TeamListItem[] {
    const rows = db.prepare('SELECT * FROM teams ORDER BY builtin DESC, name ASC').all() as Record<string, unknown>[];
    const agentsById = new Map(agentsRepo.list().map(agent => [agent.id, agent]));
    return rows.map(r => {
      const team = rowToTeamConfig(r);
      const activeVersion = this.getVersion(team.activeVersionId);
      const members = activeVersion
        ? activeVersion.memberIds
            .map(id => activeVersion.memberSnapshots.find(snapshot => snapshot.id === id) ?? agentsRepo.get(id) ?? agentsById.get(id))
            .filter((a): a is NonNullable<typeof a> => a !== undefined)
            .map(a => ({ id: a.id, name: a.name, roleLabel: a.roleLabel, provider: a.provider }))
        : [];
      return {
        ...team,
        activeVersion: activeVersion ?? {
          id: '',
          teamId: team.id,
          versionNumber: 0,
          name: '',
          sourceSceneId: team.sourceSceneId,
          memberIds: [],
          memberSnapshots: [],
          workflowPrompt: '',
          routingPolicy: {},
          teamMemory: [],
          maxA2ADepth: 5,
          createdAt: 0,
          createdFrom: 'scene-seed',
        },
        members,
      };
    });
  },

  get(id: string): TeamConfig | undefined {
    const r = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!r) return undefined;
    return rowToTeamConfig(r);
  },

  getVersion(versionId: string): TeamVersionConfig | undefined {
    const r = db.prepare('SELECT * FROM team_versions WHERE id = ?').get(versionId) as Record<string, unknown> | undefined;
    if (!r) return undefined;
    return rowToTeamVersionConfig(r);
  },

  getActiveVersion(teamId: string): TeamVersionConfig | undefined {
    const team = this.get(teamId);
    if (!team) return undefined;
    return this.getVersion(team.activeVersionId);
  },

  /** Seed Teams from existing Scenes. Idempotent — never overwrites existing data. */
  ensureFromScenes(): { teamsInserted: number; versionsInserted: number } {
    const scenes = db.prepare('SELECT * FROM scenes').all() as Record<string, unknown>[];
    let teamsInserted = 0;
    let versionsInserted = 0;

    const insertTeam = db.prepare(`
      INSERT INTO teams (id, name, description, builtin, source_scene_id, active_version_id, created_at, updated_at)
      SELECT @id, @name, @description, @builtin, @sourceSceneId, @activeVersionId, @createdAt, @updatedAt
      WHERE NOT EXISTS (SELECT 1 FROM teams WHERE id = @id)
    `);

    const insertVersion = db.prepare(`
      INSERT INTO team_versions (id, team_id, version_number, name, description, source_scene_id, member_ids_json, member_snapshots_json, workflow_prompt, routing_policy_json, team_memory_json, max_a2a_depth, created_at, created_from)
      SELECT @id, @teamId, @versionNumber, @name, @description, @sourceSceneId, @memberIdsJson, @memberSnapshotsJson, @workflowPrompt, @routingPolicyJson, @teamMemoryJson, @maxA2ADepth, @createdAt, @createdFrom
      WHERE NOT EXISTS (SELECT 1 FROM team_versions WHERE id = @id)
    `);

    const allAgents = agentsRepo.list();
    const now = Date.now();

    for (const scene of scenes) {
      const sceneId = scene.id as string;
      const sceneName = scene.name as string;
      const versionId = `${sceneId}-v1`;

      // Generate team name: append 团队 if not already ending with it
      const teamName = sceneName.endsWith('团队') ? sceneName : `${sceneName}团队`;

      // Find agents whose tags include this scene's name
      const members = allAgents.filter(agent => agent.tags.includes(sceneName));
      const memberIds = members.map(agent => agent.id);
      const memberSnapshots: TeamVersionMemberSnapshot[] = members.map(agent => ({
        id: agent.id,
        name: agent.name,
        roleLabel: agent.roleLabel,
        provider: agent.provider,
        providerOpts: agent.providerOpts,
        systemPrompt: agent.systemPrompt,
      }));

      const info = insertTeam.run({
        id: sceneId,
        name: teamName,
        description: (scene.description as string) ?? null,
        builtin: scene.builtin ? 1 : 0,
        sourceSceneId: sceneId,
        activeVersionId: versionId,
        createdAt: now,
        updatedAt: now,
      });
      if (info.changes > 0) teamsInserted++;

      const vinfo = insertVersion.run({
        id: versionId,
        teamId: sceneId,
        versionNumber: 1,
        name: teamName,
        description: (scene.description as string) ?? null,
        sourceSceneId: sceneId,
        memberIdsJson: JSON.stringify(memberIds),
        memberSnapshotsJson: JSON.stringify(memberSnapshots),
        workflowPrompt: scene.prompt as string,
        routingPolicyJson: JSON.stringify({ source: 'scene-default' }),
        teamMemoryJson: '[]',
        maxA2ADepth: (scene.max_a2a_depth as number) ?? 5,
        createdAt: now,
        createdFrom: 'scene-seed',
      });
      if (vinfo.changes > 0) versionsInserted++;
    }

    return { teamsInserted, versionsInserted };
  },
};
