import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const providerSettings = readFileSync(resolve(root, 'components/settings-modal/ProviderSettingsTab.tsx'), 'utf8')

assert.match(providerSettings, /const providerList = Object\.values\(providers\)/)
assert.match(providerSettings, /lg:grid-cols-\[250px_minmax\(0,1fr\)\]/)
assert.match(providerSettings, /Provider · \{providerList\.length\}/)
assert.match(providerSettings, /font-display text-\[28px\]/)
assert.match(providerSettings, /本地 CLI · \{provider\.defaultModel \|\| '默认模型'\}/)
assert.match(providerSettings, /Context Window/)
assert.match(providerSettings, /连通性测试/)
assert.match(providerSettings, /测试 Provider/)
assert.match(providerSettings, /Team Architect Provider/)
assert.match(providerSettings, /仅影响"生成 Team 方案"/)
assert.match(providerSettings, /选择哪个工具来生成新 Team 方案。已有 Team 成员的 Provider 不会被改动。/)
assert.ok(providerSettings.indexOf('CLI 路径') < providerSettings.indexOf('连通性测试'))
assert.match(providerSettings, /<ProviderDetail[\s\S]*<TeamArchitectProviderSetting/)
assert.doesNotMatch(providerSettings, /lg:grid-cols-\[280px_minmax\(0,1fr\)\]/)

console.log('settings-provider-uiux-regression: ok')
