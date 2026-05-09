import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const providerSettings = readFileSync(resolve(root, 'components/settings-modal/ProviderSettingsTab.tsx'), 'utf8')
const teamArchitectSettingsPath = resolve(root, 'components/settings-modal/TeamArchitectProviderSettingsTab.tsx')
assert.ok(
  existsSync(teamArchitectSettingsPath),
  'Team Architect Provider should be a settings tab peer instead of content inside Provider.',
)
const teamArchitectSettings = readFileSync(teamArchitectSettingsPath, 'utf8')

assert.match(providerSettings, /const providerList = Object\.values\(providers\)/)
assert.match(providerSettings, /lg:grid-cols-\[250px_minmax\(0,1fr\)\]/)
assert.match(providerSettings, /Provider · \{providerList\.length\}/)
assert.match(providerSettings, /font-display text-\[28px\]/)
assert.match(providerSettings, /本地 CLI · \{provider\.defaultModel \|\| '默认模型'\}/)
assert.match(providerSettings, /Context Window/)
assert.match(providerSettings, /命令是否存在/)
assert.match(providerSettings, /检查命令是否存在/)
assert.match(providerSettings, /只解析 CLI 路径，不会调用模型或发送 prompt/)
assert.match(providerSettings, /命令能否运行实际的 Prompt/)
assert.match(providerSettings, /运行测试 Prompt/)
assert.match(providerSettings, /说一个简单的词，比如"你好"/)
assert.match(providerSettings, /data-testid="provider-test-stack"/)
assert.match(providerSettings, /className="mt-5 space-y-4"/)
assert.ok(
  providerSettings.indexOf('data-testid="provider-test-stack"') > providerSettings.indexOf('取消'),
  'Provider test stack must wrap the two test cards, not the CLI path fields.',
)
assert.doesNotMatch(providerSettings, /data-testid="provider-test-grid"/)
assert.doesNotMatch(providerSettings, /grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/)
assert.match(providerSettings, /commandCheckStarted/)
assert.match(providerSettings, /setCommandCheckStarted\(true\)/)
assert.match(providerSettings, /promptTestStarted/)
assert.match(providerSettings, /setPromptTestStarted\(true\)/)
assert.match(providerSettings, /执行命令/)
assert.match(providerSettings, /执行状态/)
assert.match(providerSettings, /执行结果/)
assert.match(providerSettings, /执行中…/)
assert.match(providerSettings, /commandCheckStarted &&/)
assert.match(providerSettings, /promptTestStarted &&/)
assert.match(providerSettings, /loadPromptTestCommand/)
assert.match(providerSettings, /\/api\/providers\/\$\{provider\.name\}\/preview/)
assert.match(providerSettings, /handleCommandCheck/)
assert.match(providerSettings, /handlePromptTest/)
assert.match(providerSettings, /onRefreshReadiness\?\.\(\)/)
assert.match(providerSettings, /\/api\/providers\/\$\{provider\.name\}\/test/)
assert.doesNotMatch(providerSettings, /<h3 className="font-display text-\[16px\] font-bold text-ink">连通性测试<\/h3>/)
assert.doesNotMatch(providerSettings, />测试 Provider</)
assert.doesNotMatch(providerSettings, /Team Architect Provider/)
assert.doesNotMatch(providerSettings, /仅影响"生成 Team 方案"/)
assert.doesNotMatch(providerSettings, /选择哪个工具来生成新 Team 方案。已有 Team 成员的 Provider 不会被改动。/)
assert.doesNotMatch(providerSettings, /teamArchitectProvider/)
assert.doesNotMatch(providerSettings, /\/api\/system-settings\/team-architect/)
assert.match(teamArchitectSettings, /Team Architect Provider/)
assert.match(teamArchitectSettings, /仅影响"生成 Team 方案"/)
assert.match(teamArchitectSettings, /选择哪个工具来生成新 Team 方案。已有 Team 成员的 Provider 不会被改动。/)
assert.match(teamArchitectSettings, /保存 Team 方案生成工具/)
assert.ok(providerSettings.indexOf('CLI 路径') < providerSettings.indexOf('命令是否存在'))
assert.ok(providerSettings.indexOf('命令是否存在') < providerSettings.indexOf('命令能否运行实际的 Prompt'))
assert.doesNotMatch(providerSettings, /lg:grid-cols-\[280px_minmax\(0,1fr\)\]/)

console.log('settings-provider-uiux-regression: ok')
