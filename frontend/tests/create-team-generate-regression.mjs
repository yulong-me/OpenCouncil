import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'components/CreateRoomModal.tsx'), 'utf8')

assert.match(source, /teamDraftOpen \? 'max-w-\[760px\]' : 'max-w-\[720px\]'/)
assert.match(source, /描述你想让这支 Team 长期擅长什么，下面会给出一份可审阅的方案/)
assert.match(source, /长期帮我做小红书选题、脚本、复盘和账号改进/)
assert.match(source, /Team 方案/)
assert.match(source, /由 Team Architect/)
assert.match(source, /重新生成/)
assert.match(source, /使命：/)
assert.match(source, /协作方式 · 分工规则 · 检查方式/)
assert.match(source, /方案确认后会创建 Team v1，并立即进入协作现场/)
assert.match(source, /创建 Team 并进入现场/)
assert.doesNotMatch(source, /teamDraftOpen \? '先创建 Team'/)

console.log('create-team-generate-regression: ok')
