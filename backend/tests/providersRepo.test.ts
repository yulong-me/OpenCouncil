import { beforeEach, describe, expect, it, vi } from 'vitest'

const runMock = vi.hoisted(() => vi.fn())
const prepareMock = vi.hoisted(() => vi.fn(() => ({ run: runMock })))

vi.mock('../src/db/db.js', () => ({
  db: {
    prepare: prepareMock,
  },
}))

import { providersRepo } from '../src/db/repositories/providers.js'

describe('providersRepo.upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves existing test metadata when saving provider settings', () => {
    providersRepo.upsert('opencode', {
      label: 'OpenCode',
      cliPath: '~/.opencode/bin/opencode',
      defaultModel: 'MiniMax-M2.7',
      contextWindow: 200000,
      apiKey: '',
      baseUrl: '',
      timeout: 1800,
      thinking: true,
    })

    expect(prepareMock).toHaveBeenCalledTimes(1)
    const sql = String(prepareMock.mock.calls[0]?.[0] ?? '')
    expect(sql).toContain('ON CONFLICT(name) DO UPDATE SET')
    expect(sql).not.toContain('last_tested = NULL')
    expect(sql).not.toContain('last_test_result = NULL')
    expect(runMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'opencode',
      contextWindow: 200000,
      thinking: 1,
    }))
  })
})
