import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { teamsRepo } from './teams.js';
import type {
  EvolutionChangeDecision,
  EvolutionChangeKind,
  EvolutionProposal,
  EvolutionProposalChange,
  TeamVersionConfig,
  TeamVersionMemberSnapshot,
  TeamVersionQualityTimelineItem,
  ValidationCase,
  ValidationPreflightCaseResult,
  ValidationPreflightReport,
  ValidationPreflightResult,
  ValidationPreflightSummary,
} from '../../types.js';

export type CreateEvolutionChangeInput = {
  kind: EvolutionChangeKind;
  title: string;
  why: string;
  evidenceMessageIds: string[];
  targetLayer: string;
  before: unknown;
  after: unknown;
  impact: string;
};

export type CreateEvolutionProposalInput = {
  roomId: string;
  teamId: string;
  baseVersionId: string;
  targetVersionNumber: number;
  summary: string;
  feedback?: string;
  changes: CreateEvolutionChangeInput[];
};

export type EvolutionRepoErrorCode =
  | 'EVOLUTION_PROPOSAL_NOT_FOUND'
  | 'EVOLUTION_CHANGE_NOT_FOUND'
  | 'EVOLUTION_BASE_VERSION_NOT_FOUND'
  | 'EVOLUTION_PROPOSAL_STATE_CONFLICT'
  | 'EVOLUTION_TARGET_VERSION_EXISTS'
  | 'EVOLUTION_PREFLIGHT_REQUIRED'
  | 'EVOLUTION_VALIDATION_FAILED';

export class EvolutionRepoError extends Error {
  code: EvolutionRepoErrorCode;

  constructor(code: EvolutionRepoErrorCode, message: string) {
    super(message);
    this.name = 'EvolutionRepoError';
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

function rowToChange(row: Record<string, unknown>): EvolutionProposalChange {
  return {
    id: row.id as string,
    proposalId: row.proposal_id as string,
    ordinal: row.ordinal as number,
    kind: row.kind as EvolutionChangeKind,
    title: row.title as string,
    why: row.why as string,
    evidenceMessageIds: parseJsonField<string[]>(row.evidence_message_ids_json, []),
    targetLayer: row.target_layer as string,
    before: parseJsonField<unknown>(row.before_json, null),
    after: parseJsonField<unknown>(row.after_json, null),
    impact: row.impact as string,
    decision: (row.decision as EvolutionChangeDecision | null) ?? undefined,
    decidedAt: (row.decided_at as number | null) ?? undefined,
  };
}

function rowToProposal(row: Record<string, unknown>, changes: EvolutionProposalChange[]): EvolutionProposal {
  const validationPreflight = getPreflightReport(row.id as string, `${row.team_id as string}-v${row.target_version_number as number}`);
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    teamId: row.team_id as string,
    baseVersionId: row.base_version_id as string,
    targetVersionNumber: row.target_version_number as number,
    status: row.status as EvolutionProposal['status'],
    summary: row.summary as string,
    feedback: (row.feedback as string | null) ?? undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    validationPreflightCheckedAt: (row.preflight_checked_at as number | null) ?? undefined,
    appliedVersionId: (row.applied_version_id as string | null) ?? undefined,
    changes,
    validationPreflight,
  };
}

function rowToValidationCase(row: Record<string, unknown>): ValidationCase {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    sourceRoomId: (row.source_room_id as string | null) ?? undefined,
    sourceProposalId: (row.proposal_id as string | null) ?? undefined,
    sourceChangeId: (row.change_id as string | null) ?? undefined,
    baseVersionId: (row.base_version_id as string | null) ?? undefined,
    createdVersionId: (row.created_version_id as string | null) ?? undefined,
    failureSummary: (row.failure_summary as string | null) || (row.title as string) || '',
    inputSnapshot: parseJsonField<unknown>(row.input_snapshot_json, null),
    expectedBehavior: (row.expected_behavior as string | null) || (row.expected_outcome as string) || '',
    assertionType: row.assertion_type === 'replay' ? 'replay' : 'checklist',
    createdFromChangeId: ((row.change_id as string | null) ?? 'team-draft'),
    status: row.status === 'archived' ? 'archived' : 'active',
    evidenceMessageIds: parseJsonField<string[]>(row.evidence_message_ids_json, []),
    createdAt: row.created_at as number,
  };
}

function rowToPreflightResult(row: Record<string, unknown>): ValidationPreflightCaseResult {
  return {
    id: row.id as string,
    proposalId: row.proposal_id as string,
    validationCaseId: row.validation_case_id as string,
    targetVersionId: row.target_version_id as string,
    result: row.result as ValidationPreflightResult,
    reason: row.reason as string,
    checkedAt: row.checked_at as number,
  };
}

function summarizePreflight(results: ValidationPreflightCaseResult[]): ValidationPreflightSummary {
  return {
    pass: results.filter(result => result.result === 'pass').length,
    fail: results.filter(result => result.result === 'fail').length,
    needsReview: results.filter(result => result.result === 'needs-review').length,
  };
}

function getPreflightReport(proposalId: string, targetVersionId: string): ValidationPreflightReport | undefined {
  const rows = db.prepare('SELECT * FROM team_validation_preflight_results WHERE proposal_id = ? ORDER BY checked_at ASC, id ASC')
    .all(proposalId) as Record<string, unknown>[];
  if (rows.length === 0) return undefined;
  const results = rows.map(rowToPreflightResult);
  return {
    proposalId,
    targetVersionId,
    summary: summarizePreflight(results),
    results,
  };
}

function getProposal(id: string): EvolutionProposal | undefined {
  const row = db.prepare('SELECT * FROM evolution_proposals WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  const changes = db.prepare('SELECT * FROM evolution_proposal_changes WHERE proposal_id = ? ORDER BY ordinal ASC')
    .all(id) as Record<string, unknown>[];
  return rowToProposal(row, changes.map(rowToChange));
}

function getLatestVersionNumber(teamId: string): number {
  const row = db.prepare('SELECT MAX(version_number) as max_version FROM team_versions WHERE team_id = ?')
    .get(teamId) as { max_version: number | null };
  return row.max_version ?? 0;
}

function assertReplaceableProposal(proposal: EvolutionProposal): void {
  if (proposal.status !== 'draft' && proposal.status !== 'pending' && proposal.status !== 'in-review') {
    throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', `Cannot replace ${proposal.status} proposal`);
  }
}

function assertCreateInput(input: CreateEvolutionProposalInput): void {
  if (input.changes.length === 0) {
    throw new Error('Evolution proposal requires at least one change');
  }
  for (const change of input.changes) {
    if (change.evidenceMessageIds.length === 0) {
      throw new Error(`Evolution change requires evidence: ${change.title}`);
    }
    if (!change.targetLayer.trim()) {
      throw new Error(`Evolution change requires target layer: ${change.title}`);
    }
  }
}

function insertEvolutionProposal(input: CreateEvolutionProposalInput, proposalId: string, now: number): void {
  db.prepare(`
    INSERT INTO evolution_proposals (
      id, room_id, team_id, base_version_id, target_version_number,
      status, summary, feedback, created_at, updated_at, preflight_checked_at, applied_version_id
    )
    VALUES (
      @id, @roomId, @teamId, @baseVersionId, @targetVersionNumber,
      'pending', @summary, @feedback, @createdAt, @updatedAt, NULL, NULL
    )
  `).run({
    id: proposalId,
    roomId: input.roomId,
    teamId: input.teamId,
    baseVersionId: input.baseVersionId,
    targetVersionNumber: input.targetVersionNumber,
    summary: input.summary,
    feedback: input.feedback ?? null,
    createdAt: now,
    updatedAt: now,
  });

  input.changes.forEach((change, index) => {
    db.prepare(`
      INSERT INTO evolution_proposal_changes (
        id, proposal_id, ordinal, kind, title, why, evidence_message_ids_json,
        target_layer, before_json, after_json, impact, decision, decided_at
      )
      VALUES (
        @id, @proposalId, @ordinal, @kind, @title, @why, @evidenceMessageIdsJson,
        @targetLayer, @beforeJson, @afterJson, @impact, NULL, NULL
      )
    `).run({
      id: uuid(),
      proposalId,
      ordinal: index,
      kind: change.kind,
      title: change.title,
      why: change.why,
      evidenceMessageIdsJson: JSON.stringify(change.evidenceMessageIds),
      targetLayer: change.targetLayer,
      beforeJson: JSON.stringify(change.before ?? null),
      afterJson: JSON.stringify(change.after ?? null),
      impact: change.impact,
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  const record = asRecord(value);
  if (Array.isArray(record.memory)) return asStringArray(record.memory);
  if (typeof record.memory === 'string') return asStringArray(record.memory);
  return [];
}

function normalizeValidationCaseAfter(change: EvolutionProposalChange): {
  failureSummary: string;
  inputSnapshot: unknown;
  expectedBehavior: string;
  assertionType: 'checklist' | 'replay';
  title: string;
} {
  const after = asRecord(change.after);
  const expectedBehavior = typeof after.expectedBehavior === 'string'
    ? after.expectedBehavior
    : typeof after.expectedOutcome === 'string'
      ? after.expectedOutcome
      : '';
  const inputSnapshot = after.inputSnapshot ?? (typeof after.prompt === 'string' ? { prompt: after.prompt } : null);
  return {
    failureSummary: typeof after.failureSummary === 'string'
      ? after.failureSummary
      : typeof after.title === 'string'
        ? after.title
        : change.title,
    inputSnapshot,
    expectedBehavior,
    assertionType: after.assertionType === 'replay' ? 'replay' : 'checklist',
    title: typeof after.title === 'string' ? after.title : change.title,
  };
}

function normalizeMemberSnapshot(value: unknown): TeamVersionMemberSnapshot | undefined {
  const record = asRecord(value);
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const roleLabel = typeof record.roleLabel === 'string' ? record.roleLabel.trim() : '';
  const provider = record.provider === 'opencode' || record.provider === 'codex' || record.provider === 'claude-code'
    ? record.provider
    : 'claude-code';
  const systemPrompt = typeof record.systemPrompt === 'string' ? record.systemPrompt : '';
  if (!id || !name || !roleLabel) return undefined;
  return {
    id,
    name,
    roleLabel,
    provider,
    providerOpts: asRecord(record.providerOpts),
    systemPrompt,
  };
}

function applyChangeToVersion(version: TeamVersionConfig, change: EvolutionProposalChange): void {
  switch (change.kind) {
    case 'add-agent': {
      const snapshot = normalizeMemberSnapshot(change.after);
      if (!snapshot || version.memberIds.includes(snapshot.id)) return;
      version.memberIds = [...version.memberIds, snapshot.id];
      version.memberSnapshots = [...version.memberSnapshots, snapshot];
      return;
    }
    case 'edit-agent-prompt': {
      const after = asRecord(change.after);
      const agentId = typeof after.agentId === 'string' ? after.agentId : undefined;
      const systemPrompt = typeof after.systemPrompt === 'string'
        ? after.systemPrompt
        : typeof change.after === 'string'
          ? change.after
          : undefined;
      if (!agentId || systemPrompt === undefined) return;
      version.memberSnapshots = version.memberSnapshots.map(snapshot =>
        snapshot.id === agentId ? { ...snapshot, systemPrompt } : snapshot,
      );
      return;
    }
    case 'edit-team-workflow': {
      const after = asRecord(change.after);
      const workflowPrompt = typeof change.after === 'string'
        ? change.after
        : typeof after.workflowPrompt === 'string'
          ? after.workflowPrompt
          : undefined;
      if (workflowPrompt !== undefined) {
        version.workflowPrompt = workflowPrompt;
      }
      return;
    }
    case 'edit-routing-policy': {
      const after = asRecord(change.after);
      version.routingPolicy = asRecord(after.routingPolicy ?? change.after);
      return;
    }
    case 'add-team-memory': {
      const additions = asStringArray(change.after);
      const existing = new Set(version.teamMemory);
      version.teamMemory = [...version.teamMemory, ...additions.filter(item => !existing.has(item))];
      return;
    }
    case 'add-validation-case':
      return;
  }
}

function insertValidationCase(
  teamId: string,
  proposal: EvolutionProposal,
  change: EvolutionProposalChange,
  createdVersionId: string | undefined,
  now: number,
): ValidationCase {
  const existing = db.prepare('SELECT * FROM team_validation_cases WHERE proposal_id = ? AND change_id = ?')
    .get(proposal.id, change.id) as Record<string, unknown> | undefined;
  if (existing) {
    if (createdVersionId && !existing.created_version_id) {
      db.prepare('UPDATE team_validation_cases SET created_version_id = ? WHERE id = ?').run(createdVersionId, existing.id);
      return rowToValidationCase({ ...existing, created_version_id: createdVersionId });
    }
    return rowToValidationCase(existing);
  }

  const normalized = normalizeValidationCaseAfter(change);
  const id = uuid();
  db.prepare(`
    INSERT INTO team_validation_cases (
      id, team_id, proposal_id, change_id, source_room_id, base_version_id, created_version_id,
      title, failure_summary, input_snapshot_json, expected_behavior, assertion_type, status,
      prompt, expected_outcome, evidence_message_ids_json, created_at
    )
    VALUES (
      @id, @teamId, @proposalId, @changeId, @sourceRoomId, @baseVersionId, @createdVersionId,
      @title, @failureSummary, @inputSnapshotJson, @expectedBehavior, @assertionType, 'active',
      @prompt, @expectedOutcome, @evidenceMessageIdsJson, @createdAt
    )
  `).run({
    id,
    teamId,
    proposalId: proposal.id,
    changeId: change.id,
    sourceRoomId: proposal.roomId,
    baseVersionId: proposal.baseVersionId,
    createdVersionId: createdVersionId ?? null,
    title: normalized.title,
    failureSummary: normalized.failureSummary,
    inputSnapshotJson: JSON.stringify(normalized.inputSnapshot ?? null),
    expectedBehavior: normalized.expectedBehavior,
    assertionType: normalized.assertionType,
    prompt: typeof asRecord(change.after).prompt === 'string' ? asRecord(change.after).prompt : '',
    expectedOutcome: normalized.expectedBehavior,
    evidenceMessageIdsJson: JSON.stringify(change.evidenceMessageIds),
    createdAt: now,
  });
  return rowToValidationCase(db.prepare('SELECT * FROM team_validation_cases WHERE id = ?').get(id) as Record<string, unknown>);
}

function listValidationCasesByTeam(teamId: string): ValidationCase[] {
  const rows = db.prepare('SELECT * FROM team_validation_cases WHERE team_id = ? AND status = ? ORDER BY created_at ASC')
    .all(teamId, 'active') as Record<string, unknown>[];
  return rows.map(rowToValidationCase);
}

function listValidationCasesForProposal(proposalId: string): ValidationCase[] {
  const proposal = getProposal(proposalId);
  if (!proposal) throw new EvolutionRepoError('EVOLUTION_PROPOSAL_NOT_FOUND', `Evolution proposal not found: ${proposalId}`);
  const rows = db.prepare(`
    SELECT * FROM team_validation_cases
    WHERE proposal_id = @proposalId OR team_id = @teamId
    ORDER BY created_at ASC
  `).all({ proposalId, teamId: proposal.teamId }) as Record<string, unknown>[];
  const byId = new Map(rows.map(row => [row.id as string, rowToValidationCase(row)]));
  return Array.from(byId.values());
}

function buildDraftVersion(proposal: EvolutionProposal): TeamVersionConfig {
  const baseVersion = teamsRepo.getVersion(proposal.baseVersionId);
  if (!baseVersion) throw new EvolutionRepoError('EVOLUTION_BASE_VERSION_NOT_FOUND', `Base TeamVersion not found: ${proposal.baseVersionId}`);
  const draft: TeamVersionConfig = {
    ...baseVersion,
    id: `${proposal.teamId}-v${proposal.targetVersionNumber}`,
    versionNumber: proposal.targetVersionNumber,
    memberIds: [...baseVersion.memberIds],
    memberSnapshots: baseVersion.memberSnapshots.map(snapshot => ({ ...snapshot, providerOpts: { ...snapshot.providerOpts } })),
    routingPolicy: { ...baseVersion.routingPolicy },
    teamMemory: [...baseVersion.teamMemory],
    createdAt: Date.now(),
    createdFrom: 'evolution-pr',
  };
  for (const change of proposal.changes.filter(change => change.decision === 'accepted')) {
    applyChangeToVersion(draft, change);
  }
  return draft;
}

function evaluateValidationCase(validationCase: ValidationCase, draft: TeamVersionConfig): { result: ValidationPreflightResult; reason: string } {
  if (validationCase.assertionType !== 'checklist') {
    return { result: 'needs-review', reason: 'Replay validation requires human review in V1 preflight.' };
  }
  const expected = validationCase.expectedBehavior.trim();
  if (!expected) {
    return { result: 'needs-review', reason: 'Validation case has no expected behavior checklist.' };
  }
  const searchable = [
    draft.workflowPrompt,
    JSON.stringify(draft.routingPolicy),
    draft.teamMemory.join('\n'),
    ...draft.memberSnapshots.map(snapshot => snapshot.systemPrompt),
  ].join('\n');
  if (searchable.includes(expected)) {
    return { result: 'pass', reason: `Draft TeamVersion contains expected behavior: ${expected}` };
  }
  return { result: 'fail', reason: `Draft TeamVersion does not contain expected behavior: ${expected}` };
}

const mergeTransaction = db.transaction((proposalId: string, options?: { confirmFailedValidation?: boolean }): { proposal: EvolutionProposal; version?: TeamVersionConfig } => {
  const proposal = getProposal(proposalId);
  if (!proposal) throw new EvolutionRepoError('EVOLUTION_PROPOSAL_NOT_FOUND', `Evolution proposal not found: ${proposalId}`);
  if (proposal.status === 'applied' || proposal.status === 'rejected' || proposal.status === 'expired') {
    throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', `Evolution proposal is already ${proposal.status}: ${proposalId}`);
  }
  if (proposal.changes.some(change => !change.decision)) {
    throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', 'Review every change before merging evolution proposal');
  }
  const acceptedChanges = proposal.changes.filter(change => change.decision === 'accepted');
  const now = Date.now();
  if (acceptedChanges.length === 0) {
    db.prepare(`
      UPDATE evolution_proposals
      SET status = 'rejected', updated_at = @updatedAt
      WHERE id = @id
    `).run({ id: proposal.id, updatedAt: now });
    return { proposal: getProposal(proposal.id)! };
  }

  const baseVersion = teamsRepo.getVersion(proposal.baseVersionId);
  if (!baseVersion) throw new EvolutionRepoError('EVOLUTION_BASE_VERSION_NOT_FOUND', `Base TeamVersion not found: ${proposal.baseVersionId}`);
  const targetVersionId = `${proposal.teamId}-v${proposal.targetVersionNumber}`;
  if (teamsRepo.getVersion(targetVersionId)) {
    throw new EvolutionRepoError('EVOLUTION_TARGET_VERSION_EXISTS', `Target TeamVersion already exists: ${targetVersionId}`);
  }

  const nextVersion: TeamVersionConfig = {
    ...baseVersion,
    id: targetVersionId,
    versionNumber: proposal.targetVersionNumber,
    memberIds: [...baseVersion.memberIds],
    memberSnapshots: baseVersion.memberSnapshots.map(snapshot => ({ ...snapshot, providerOpts: { ...snapshot.providerOpts } })),
    routingPolicy: { ...baseVersion.routingPolicy },
    teamMemory: [...baseVersion.teamMemory],
    createdAt: now,
    createdFrom: 'evolution-pr',
  };

  for (const change of acceptedChanges) {
    applyChangeToVersion(nextVersion, change);
  }

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
    id: nextVersion.id,
    teamId: nextVersion.teamId,
    versionNumber: nextVersion.versionNumber,
    name: nextVersion.name,
    description: nextVersion.description ?? null,
    sourceSceneId: nextVersion.sourceSceneId,
    memberIdsJson: JSON.stringify(nextVersion.memberIds),
    memberSnapshotsJson: JSON.stringify(nextVersion.memberSnapshots),
    workflowPrompt: nextVersion.workflowPrompt,
    routingPolicyJson: JSON.stringify(nextVersion.routingPolicy),
    teamMemoryJson: JSON.stringify(nextVersion.teamMemory),
    maxA2ADepth: nextVersion.maxA2ADepth,
    createdAt: nextVersion.createdAt,
    createdFrom: nextVersion.createdFrom,
  });

  for (const change of acceptedChanges.filter(change => change.kind === 'add-validation-case')) {
    insertValidationCase(proposal.teamId, proposal, change, nextVersion.id, now);
  }

  db.prepare(`
    UPDATE teams
    SET active_version_id = @activeVersionId, updated_at = @updatedAt
    WHERE id = @teamId
  `).run({
    teamId: proposal.teamId,
    activeVersionId: nextVersion.id,
    updatedAt: now,
  });

  db.prepare(`
    UPDATE evolution_proposals
    SET status = 'applied', applied_version_id = @appliedVersionId, updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: proposal.id,
    appliedVersionId: nextVersion.id,
    updatedAt: now,
  });

  return {
    proposal: getProposal(proposal.id)!,
    version: nextVersion,
  };
});

export const evolutionRepo = {
  create(input: CreateEvolutionProposalInput): EvolutionProposal {
    assertCreateInput(input);

    const now = Date.now();
    const proposalId = uuid();
    const insert = db.transaction(() => insertEvolutionProposal(input, proposalId, now));

    insert();
    return getProposal(proposalId)!;
  },

  createReplacing(input: CreateEvolutionProposalInput, replacesProposalId: string): EvolutionProposal {
    assertCreateInput(input);

    const now = Date.now();
    const proposalId = uuid();
    const replace = db.transaction(() => {
      const proposalToReplace = getProposal(replacesProposalId);
      if (!proposalToReplace) {
        throw new EvolutionRepoError('EVOLUTION_PROPOSAL_NOT_FOUND', `Evolution proposal not found: ${replacesProposalId}`);
      }
      if (proposalToReplace.roomId !== input.roomId) {
        throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', 'Replacement proposal does not belong to this room');
      }
      assertReplaceableProposal(proposalToReplace);

      insertEvolutionProposal(input, proposalId, now);
      const result = db.prepare(`
        UPDATE evolution_proposals
        SET status = 'rejected', updated_at = @updatedAt, preflight_checked_at = NULL
        WHERE id = @proposalId AND status IN ('draft', 'pending', 'in-review')
      `).run({ proposalId: replacesProposalId, updatedAt: now });
      if (result.changes !== 1) {
        throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', `Cannot replace ${proposalToReplace.status} proposal`);
      }
      db.prepare('DELETE FROM team_validation_preflight_results WHERE proposal_id = ?').run(replacesProposalId);
    });

    replace();
    return getProposal(proposalId)!;
  },

  get: getProposal,

  listByRoom(roomId: string): EvolutionProposal[] {
    const rows = db.prepare('SELECT * FROM evolution_proposals WHERE room_id = ? ORDER BY created_at DESC')
      .all(roomId) as Record<string, unknown>[];
    return rows.map(row => rowToProposal(
      row,
      (db.prepare('SELECT * FROM evolution_proposal_changes WHERE proposal_id = ? ORDER BY ordinal ASC')
        .all(row.id as string) as Record<string, unknown>[]).map(rowToChange),
    ));
  },

  latestTargetVersionNumber(teamId: string): number {
    return getLatestVersionNumber(teamId) + 1;
  },

  setChangeDecision(proposalId: string, changeId: string, decision: EvolutionChangeDecision): EvolutionProposal {
    const proposal = getProposal(proposalId);
    if (!proposal) throw new EvolutionRepoError('EVOLUTION_PROPOSAL_NOT_FOUND', `Evolution proposal not found: ${proposalId}`);
    if (proposal.status === 'applied' || proposal.status === 'rejected' || proposal.status === 'expired') {
      throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', `Cannot decide change for ${proposal.status} proposal`);
    }
    if (!proposal.changes.some(change => change.id === changeId)) {
      throw new EvolutionRepoError('EVOLUTION_CHANGE_NOT_FOUND', `Evolution change not found: ${changeId}`);
    }
    const now = Date.now();
    db.prepare(`
      UPDATE evolution_proposal_changes
      SET decision = @decision, decided_at = @decidedAt
      WHERE id = @changeId AND proposal_id = @proposalId
    `).run({ proposalId, changeId, decision, decidedAt: now });
    db.prepare(`
      UPDATE evolution_proposals
      SET
        status = CASE WHEN status = 'pending' THEN 'in-review' ELSE status END,
        updated_at = @updatedAt,
        preflight_checked_at = NULL
      WHERE id = @proposalId
    `).run({ proposalId, updatedAt: now });
    db.prepare('DELETE FROM team_validation_preflight_results WHERE proposal_id = ?').run(proposalId);
    return getProposal(proposalId)!;
  },

  reject(proposalId: string): EvolutionProposal {
    const proposal = getProposal(proposalId);
    if (!proposal) throw new EvolutionRepoError('EVOLUTION_PROPOSAL_NOT_FOUND', `Evolution proposal not found: ${proposalId}`);
    if (proposal.status !== 'pending' && proposal.status !== 'in-review') {
      throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', `Cannot reject ${proposal.status} proposal`);
    }
    const now = Date.now();
    db.prepare(`
      UPDATE evolution_proposals
      SET status = 'rejected', updated_at = @updatedAt, preflight_checked_at = NULL
      WHERE id = @proposalId
    `).run({ proposalId, updatedAt: now });
    db.prepare('DELETE FROM team_validation_preflight_results WHERE proposal_id = ?').run(proposalId);
    return getProposal(proposalId)!;
  },

  listValidationCasesByTeam,

  listValidationCasesForProposal,

  runPreflight(proposalId: string): ValidationPreflightReport {
    const proposal = getProposal(proposalId);
    if (!proposal) throw new EvolutionRepoError('EVOLUTION_PROPOSAL_NOT_FOUND', `Evolution proposal not found: ${proposalId}`);
    if (proposal.status === 'applied' || proposal.status === 'rejected' || proposal.status === 'expired') {
      throw new EvolutionRepoError('EVOLUTION_PROPOSAL_STATE_CONFLICT', `Cannot rerun preflight for ${proposal.status} evolution proposal: ${proposalId}`);
    }
    const draft = buildDraftVersion(proposal);
    const now = Date.now();

    for (const change of proposal.changes.filter(change => change.kind === 'add-validation-case' && change.decision === 'accepted')) {
      insertValidationCase(proposal.teamId, proposal, change, undefined, now);
    }

    const cases = listValidationCasesForProposal(proposal.id);
    db.prepare('DELETE FROM team_validation_preflight_results WHERE proposal_id = ?').run(proposal.id);
    db.prepare('UPDATE evolution_proposals SET preflight_checked_at = ? WHERE id = ?').run(now, proposal.id);
    for (const validationCase of cases) {
      const evaluation = evaluateValidationCase(validationCase, draft);
      db.prepare(`
        INSERT INTO team_validation_preflight_results (
          id, proposal_id, validation_case_id, target_version_id, result, reason, checked_at
        )
        VALUES (
          @id, @proposalId, @validationCaseId, @targetVersionId, @result, @reason, @checkedAt
        )
      `).run({
        id: uuid(),
        proposalId: proposal.id,
        validationCaseId: validationCase.id,
        targetVersionId: draft.id,
        result: evaluation.result,
        reason: evaluation.reason,
        checkedAt: now,
      });
    }

    return getPreflightReport(proposal.id, draft.id) ?? {
      proposalId: proposal.id,
      targetVersionId: draft.id,
      summary: { pass: 0, fail: 0, needsReview: 0 },
      results: [],
    };
  },

  getTeamQualityTimeline(teamId: string): TeamVersionQualityTimelineItem[] {
    const versions = db.prepare('SELECT * FROM team_versions WHERE team_id = ? ORDER BY version_number DESC')
      .all(teamId) as Record<string, unknown>[];
    const activeVersion = teamsRepo.getActiveVersion(teamId);
    return versions.map(row => {
      const versionId = row.id as string;
      const proposalRow = db.prepare('SELECT * FROM evolution_proposals WHERE applied_version_id = ?')
        .get(versionId) as Record<string, unknown> | undefined;
      const sourceProposalId = proposalRow?.id as string | undefined;
      const acceptedChangeCount = sourceProposalId
        ? (db.prepare('SELECT COUNT(*) as cnt FROM evolution_proposal_changes WHERE proposal_id = ? AND decision = ?')
            .get(sourceProposalId, 'accepted') as { cnt: number }).cnt
        : 0;
      const validationCases = (db.prepare('SELECT * FROM team_validation_cases WHERE created_version_id = ? ORDER BY created_at ASC')
        .all(versionId) as Record<string, unknown>[]).map(rowToValidationCase);
      const preflight = sourceProposalId
        ? getPreflightReport(sourceProposalId, versionId)
        : undefined;
      const laterValidationCaseCount = (db.prepare(`
        SELECT COUNT(*) as cnt
        FROM team_validation_cases vc
        JOIN team_versions tv ON tv.id = vc.created_version_id
        WHERE vc.team_id = @teamId AND tv.version_number > @versionNumber
      `).get({ teamId, versionNumber: row.version_number }) as { cnt: number }).cnt;
      const laterFailingPreflightCount = (db.prepare(`
        SELECT COUNT(*) as cnt
        FROM team_validation_preflight_results vr
        JOIN evolution_proposals ep ON ep.id = vr.proposal_id
        WHERE ep.team_id = @teamId AND ep.target_version_number > @versionNumber AND vr.result = 'fail'
      `).get({ teamId, versionNumber: row.version_number }) as { cnt: number }).cnt;

      return {
        versionId,
        versionNumber: row.version_number as number,
        createdAt: row.created_at as number,
        createdFrom: row.created_from as TeamVersionConfig['createdFrom'],
        sourceProposalId,
        acceptedChangeCount,
        addedValidationCaseCount: validationCases.length,
        preflightSummary: preflight?.summary ?? { pass: 0, fail: 0, needsReview: 0 },
        validationCases,
        rollbackEvidence: {
          comparedToVersionId: activeVersion?.id,
          validationCasesAddedAfterThisVersion: laterValidationCaseCount,
          failingPreflightsAfterThisVersion: laterFailingPreflightCount,
        },
      };
    });
  },

  merge(proposalId: string, options?: { confirmFailedValidation?: boolean }): { proposal: EvolutionProposal; version?: TeamVersionConfig } {
    return mergeTransaction(proposalId, options);
  },
};
