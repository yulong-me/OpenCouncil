import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillSettings = readFileSync(resolve(root, 'components/settings-modal/SkillSettingsTab.tsx'), 'utf8')

assert.match(skillSettings, /const selectedManagedSkill/)
assert.match(skillSettings, /lg:grid-cols-\[250px_minmax\(0,1fr\)\]/)
assert.match(skillSettings, /Managed · \{skills\.length\}/)
assert.match(skillSettings, /Global · \{globalSkills\.length\}/)
assert.match(skillSettings, /font-display text-\[28px\]/)
assert.match(skillSettings, />managed</)
assert.match(skillSettings, /SKILL\.md/)
assert.match(skillSettings, /启用状态/)
assert.match(skillSettings, /使用情况/)
assert.match(skillSettings, /删除 Skill/)
assert.match(skillSettings, /放弃修改/)
assert.match(skillSettings, /sourcePath/)
assert.doesNotMatch(skillSettings, /grid grid-cols-1 md:grid-cols-2 gap-3/)

console.log('settings-skill-uiux-regression: ok')
