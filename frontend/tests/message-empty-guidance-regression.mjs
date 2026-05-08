import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(__dirname, '../components/MessageList.tsx'), 'utf8')
const roomViewSource = readFileSync(join(__dirname, '../components/RoomView.tsx'), 'utf8')

assert.match(source, /teamId === 'software-development'/)
assert.match(source, /· 现场已就绪 ·/)
assert.match(source, /font-display text-\[36px\]/)
assert.match(source, /data-empty-room-agent-pill="true"/)
assert.match(source, /建议这样开场/)
assert.match(source, /@主架构师/)
assert.match(source, /目标：减少散热 if\/else 嵌套/)
assert.match(source, /后续接力会在房间里可见/)
assert.match(source, /\$\{teamName \?\? '当前 Team'\}/)
assert.match(roomViewSource, /teamId=\{teamId\}/)
assert.match(roomViewSource, /teamName=\{teamName\}/)

const customGuidanceBranch = source.slice(
  source.indexOf(": `${teamName ?? '当前 Team'}"),
  source.indexOf('            </p>', source.indexOf(": `${teamName ?? '当前 Team'}")),
)
assert.doesNotMatch(customGuidanceBranch, /主架构师|挑战架构师|实现工程师|软件开发任务建议/)

console.log('message-empty-guidance-regression: ok')
