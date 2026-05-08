import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const teamSettings = readFileSync(resolve(root, 'components/settings-modal/TeamSettingsTab.tsx'), 'utf8')

assert.match(teamSettings, /lg:grid-cols-\[250px_minmax\(0,1fr\)\]/)
assert.match(teamSettings, /Team · \{localTeams\.length\}/)
assert.match(teamSettings, /font-display text-\[28px\]/)
assert.match(teamSettings, /max-A2A \{activeVersion\.maxA2ADepth \?\? 5\}/)
assert.match(teamSettings, /克隆为新 Team/)
assert.match(teamSettings, /把当前 Provider 应用到全员/)
assert.match(teamSettings, /成员（\{members\.length\}）/)
assert.match(teamSettings, /分工 & 规则/)
assert.match(teamSettings, /历史版本/)
assert.doesNotMatch(teamSettings, /lg:grid-cols-\[minmax\(14rem,18rem\)_1fr\]/)

console.log('settings-team-uiux-regression: ok')
