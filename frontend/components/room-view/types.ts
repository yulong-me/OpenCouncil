import type { DiscussionState } from '@/lib/agents'

export interface RoomListItem {
  id: string
  topic: string
  createdAt: number
  updatedAt: number
  state: DiscussionState
  activityState?: 'busy' | 'open' | 'done'
  workspace?: string
  preview?: string
  agentCount: number
  teamId?: string
  teamVersionId?: string
  teamName?: string
  teamVersionNumber?: number
}

export interface RoomSkillSummary {
  effectiveSkills: Array<{ name: string; mode: 'auto' | 'required'; sourceLabel: string }>
  globalSkillCount: number
  workspaceDiscoveredCount: number
}

export type EvolutionProposalStatus = 'draft' | 'pending' | 'in-review' | 'applied' | 'rejected' | 'expired'
export type EvolutionChangeKind =
  | 'add-agent'
  | 'edit-agent-prompt'
  | 'edit-team-workflow'
  | 'edit-routing-policy'
  | 'add-team-memory'
  | 'add-validation-case'
export type EvolutionChangeDecision = 'accepted' | 'rejected'

export interface EvolutionProposalChange {
  id: string
  proposalId: string
  ordinal: number
  kind: EvolutionChangeKind
  title: string
  why: string
  evidenceMessageIds: string[]
  targetLayer: string
  before: unknown
  after: unknown
  impact: string
  decision?: EvolutionChangeDecision
  decidedAt?: number
}

export type ValidationPreflightResult = 'pass' | 'fail' | 'needs-review'

export interface ValidationCase {
  id: string
  teamId: string
  sourceRoomId: string
  sourceProposalId: string
  sourceChangeId: string
  baseVersionId: string
  createdVersionId?: string
  failureSummary: string
  inputSnapshot: unknown
  expectedBehavior: string
  assertionType: 'checklist' | 'replay'
  createdFromChangeId: string
  status: 'active' | 'archived'
  evidenceMessageIds: string[]
  createdAt: number
}

export interface ValidationPreflightCaseResult {
  id: string
  proposalId: string
  validationCaseId: string
  targetVersionId: string
  result: ValidationPreflightResult
  reason: string
  checkedAt: number
}

export interface ValidationPreflightReport {
  proposalId: string
  targetVersionId: string
  summary: { pass: number; fail: number; needsReview: number }
  results: ValidationPreflightCaseResult[]
}

export interface EvolutionProposal {
  id: string
  roomId: string
  teamId: string
  baseVersionId: string
  targetVersionNumber: number
  status: EvolutionProposalStatus
  summary: string
  feedback?: string
  createdAt: number
  updatedAt: number
  validationPreflightCheckedAt?: number
  appliedVersionId?: string
  changes: EvolutionProposalChange[]
  validationPreflight?: ValidationPreflightReport
}
