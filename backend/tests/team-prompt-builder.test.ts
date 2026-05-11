import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/store.js', () => ({
  store: {
    get: vi.fn(),
  },
}));

vi.mock('../src/db/index.js', () => ({
  teamsRepo: {
    getActiveVersion: vi.fn(),
    getVersion: vi.fn(),
  },
}));

import { buildRoomScopedSystemPrompt } from '../src/services/teamPromptBuilder.js';
import { teamsRepo } from '../src/db/index.js';
import { store } from '../src/store.js';

describe('teamPromptBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('injects the pinned TeamVersion team memory into agent prompts', () => {
    vi.mocked(store.get).mockReturnValue({
      id: 'room-1',
      topic: '做技术视频',
      state: 'RUNNING',
      agents: [
        {
          id: 'runtime-1',
          role: 'WORKER',
          name: 'Script Director',
          domainLabel: 'Script',
          configId: 'script-director',
          status: 'idle',
        },
      ],
      messages: [],
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
      maxA2ADepth: null,
      teamId: 'technical-video-studio',
      teamVersionId: 'technical-video-studio-v2',
      createdAt: 1,
      updatedAt: 1,
    });
    vi.mocked(teamsRepo.getVersion).mockReturnValue({
      id: 'technical-video-studio-v2',
      teamId: 'technical-video-studio',
      versionNumber: 2,
      name: 'Agent Technical Video Studio',
      memberIds: ['script-director'],
      memberSnapshots: [],
      workflowPrompt: '新版协作流程',
      routingPolicy: {},
      teamMemory: ['交付前必须覆盖发布步骤', '新成员 Browser Publishing Operator 负责浏览器发布'],
      maxA2ADepth: 5,
      createdAt: 2,
      createdFrom: 'evolution-pr',
    });

    const prompt = buildRoomScopedSystemPrompt('room-1', '基础人设', {
      userMessage: '继续完善',
    });

    expect(prompt).toContain('【团队记忆】');
    expect(prompt).toContain('- 交付前必须覆盖发布步骤');
    expect(prompt).toContain('- 新成员 Browser Publishing Operator 负责浏览器发布');
  });
});
