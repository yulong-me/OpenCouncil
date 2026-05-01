import { Router, type Response } from 'express';
import { evolutionRepo, teamsRepo } from '../db/index.js';
import { generateTeamDraftFromGoal } from '../services/teamDrafts.js';

export const teamsRouter = Router();

const EVOLUTION_ERROR_STATUS: Record<string, number> = {
  EVOLUTION_PROPOSAL_NOT_FOUND: 404,
  EVOLUTION_CHANGE_NOT_FOUND: 404,
  EVOLUTION_BASE_VERSION_NOT_FOUND: 404,
  EVOLUTION_PROPOSAL_STATE_CONFLICT: 409,
  EVOLUTION_TARGET_VERSION_EXISTS: 409,
  EVOLUTION_PREFLIGHT_REQUIRED: 409,
  EVOLUTION_VALIDATION_FAILED: 409,
  TEAM_GOAL_TOO_VAGUE: 400,
  TEAM_DRAFT_INVALID: 400,
  TEAM_DRAFT_AGENT_FAILED: 503,
};

function sendEvolutionError(res: Response, err: unknown, fallback: string) {
  const error = err as Error & { code?: string };
  const status = error.code ? EVOLUTION_ERROR_STATUS[error.code] : undefined;
  return res.status(status ?? 400).json({
    ...(error.code ? { code: error.code } : {}),
    error: error.message || fallback,
  });
}

teamsRouter.post('/drafts', async (req, res) => {
  try {
    const goal = typeof req.body?.goal === 'string' ? req.body.goal : '';
    return res.json(await generateTeamDraftFromGoal(goal));
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to generate Team draft');
  }
});

teamsRouter.post('/', (req, res) => {
  try {
    return res.json(teamsRepo.createFromDraft(req.body?.draft));
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to create Team from draft');
  }
});

teamsRouter.patch('/evolution-proposals/:proposalId/changes/:changeId', (req, res) => {
  const decision = req.body?.decision;
  if (decision !== 'accepted' && decision !== 'rejected') {
    return res.status(400).json({ error: 'decision must be accepted or rejected' });
  }

  try {
    const proposal = evolutionRepo.setChangeDecision(req.params.proposalId, req.params.changeId, decision);
    return res.json(proposal);
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to update evolution change decision');
  }
});

teamsRouter.post('/evolution-proposals/:proposalId/reject', (req, res) => {
  try {
    return res.json(evolutionRepo.reject(req.params.proposalId));
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to reject evolution proposal');
  }
});

teamsRouter.post('/evolution-proposals/:proposalId/merge', (req, res) => {
  try {
    const result = evolutionRepo.merge(req.params.proposalId, {
      confirmFailedValidation: req.body?.confirmFailedValidation === true,
    });
    return res.json(result);
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to merge evolution proposal');
  }
});

teamsRouter.get('/evolution-proposals/:proposalId/validation-cases', (req, res) => {
  try {
    return res.json(evolutionRepo.listValidationCasesForProposal(req.params.proposalId));
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to list validation cases');
  }
});

teamsRouter.post('/evolution-proposals/:proposalId/preflight', (req, res) => {
  try {
    return res.json(evolutionRepo.runPreflight(req.params.proposalId));
  } catch (err) {
    return sendEvolutionError(res, err, 'Failed to run validation preflight');
  }
});

teamsRouter.get('/', (_req, res) => {
  res.json(teamsRepo.list());
});

teamsRouter.get('/:id/quality-timeline', (req, res) => {
  const team = teamsRepo.get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  return res.json(evolutionRepo.getTeamQualityTimeline(req.params.id));
});

teamsRouter.get('/:id', (req, res) => {
  const team = teamsRepo.list().find(item => item.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  return res.json(team);
});
