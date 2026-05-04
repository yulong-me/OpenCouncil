import { Router } from 'express';
import { getProvider as getProviderConfig } from '../config/providerConfig.js';
import { systemSettingsRepo, normalizeTeamArchitectProvider } from '../db/repositories/systemSettings.js';

export const systemSettingsRouter = Router();

systemSettingsRouter.get('/team-architect', (_req, res) => {
  res.json({ provider: systemSettingsRepo.getTeamArchitectProvider() });
});

systemSettingsRouter.patch('/team-architect', (req, res) => {
  const provider = normalizeTeamArchitectProvider(req.body?.provider);
  if (!provider) {
    return res.status(400).json({ error: '执行工具不支持' });
  }
  if (!getProviderConfig(provider)) {
    return res.status(404).json({ error: '执行工具不存在' });
  }
  res.json({ provider: systemSettingsRepo.setTeamArchitectProvider(provider) });
});
