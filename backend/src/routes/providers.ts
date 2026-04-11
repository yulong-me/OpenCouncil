import { Router } from 'express'
import { spawn } from 'child_process'
import {
  getAllProviders,
  getProvider,
  upsertProvider,
  deleteProvider,
  updateTestResult,
  type ProviderConfig,
} from '../config/providerConfig.js'

const router = Router()

// GET /api/providers
router.get('/', (_req, res) => {
  res.json(getAllProviders())
})

// GET /api/providers/:name
router.get('/:name', (req, res) => {
  const p = getProvider(req.params.name)
  if (!p) return res.status(404).json({ error: 'Provider not found' })
  res.json(p)
})

// POST /api/providers — create or update
router.post('/', (req, res) => {
  const { name, label, cliPath, defaultModel, apiKey, baseUrl, timeout, thinking } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const config = upsertProvider(name, {
    label: label || name,
    cliPath: cliPath || 'claude',
    defaultModel: defaultModel || '',
    apiKey: apiKey || '',
    baseUrl: baseUrl || '',
    timeout: Number(timeout) || 90,
    thinking: thinking !== false,
  })
  res.json(config[name])
})

// DELETE /api/providers/:name
router.delete('/:name', (req, res) => {
  const name = req.params.name
  if (name === 'claude-code') return res.status(400).json({ error: 'Cannot delete claude-code provider' })
  deleteProvider(name)
  res.json({ ok: true })
})

// GET /api/providers/:name/preview — show the resolved command that will be executed
router.get('/:name/preview', (req, res) => {
  const p = getProvider(req.params.name)
  if (!p) return res.status(404).json({ error: 'Provider not found' })

  const cliPath = p.cliPath.replace(/^~/, process.env.HOME || '/root')

  if (p.name === 'claude-code') {
    res.json({
      provider: 'claude-code',
      cli: cliPath,
      args: ['-p', '<prompt>', '--verbose', '--output-format=stream-json', '--include-partial-messages'],
      env: {
        ...(p.apiKey ? { ANTHROPIC_API_KEY: p.apiKey ? '(已设置)' : '(未设置)' } : {}),
        ...(p.baseUrl ? { ANTHROPIC_BASE_URL: p.baseUrl } : {}),
      },
      timeout: p.timeout,
      note: 'Agent 调用时会拼接: claude -p "<角色定义>\n\n<用户消息>" --verbose ...',
    })
  } else if (p.name === 'opencode') {
    res.json({
      provider: 'opencode',
      cli: cliPath,
      args: ['run', ...(p.defaultModel ? ['-m', p.defaultModel] : []), ...(p.thinking ? ['--thinking'] : []), '--format', 'json', '--', '<prompt>'],
      env: {
        ...(p.apiKey ? { ANTHROPIC_API_KEY: '(已设置)' } : {}),
        ...(p.baseUrl ? { ANTHROPIC_BASE_URL: p.baseUrl } : {}),
      },
      timeout: p.timeout,
      note: 'Agent 调用时: opencode run -m <model> --thinking --format json -- "<prompt>"',
    })
  } else {
    res.json({ provider: p.name, cli: cliPath, note: '未知 Provider 类型' })
  }
})

// POST /api/providers/:name/test — test CLI connection
router.post('/:name/test', (req, res) => {
  const p = getProvider(req.params.name)
  if (!p) return res.status(404).json({ error: 'Provider not found' })

  const isOpencode = p.name === 'opencode'
  const cmd = isOpencode ? p.cliPath.replace(/^~/, process.env.HOME || '/root') : p.cliPath
  const args = isOpencode ? ['--version'] : ['--version']

  const env = { ...process.env }
  if (p.apiKey) env.ANTHROPIC_API_KEY = p.apiKey
  if (p.baseUrl) env.ANTHROPIC_BASE_URL = p.baseUrl

  const proc = spawn(cmd, args, { timeout: 15000, env })
  let stdout = ''
  let stderr = ''

  proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
  proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

  proc.on('close', (code) => {
    const success = code === 0
    const version = success ? stdout.trim().split('\n')[0] : undefined
    const error = success ? undefined : stderr.trim().slice(0, 200)
    const result = { success, version, error }
    updateTestResult(req.params.name, result)
    res.json(result)
  })

  proc.on('error', (err) => {
    const result = { success: false, error: err.message }
    updateTestResult(req.params.name, result)
    res.json(result)
  })
})

export default router
