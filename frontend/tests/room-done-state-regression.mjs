import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const actionArea = readFileSync(resolve(root, 'components/room-view/RoomActionArea.tsx'), 'utf8')

assert.match(actionArea, /任务已结束/)
assert.match(actionArea, /共 <b>\{messageCount\}<\/b> 条消息 · <b>\{participantCount\}<\/b> 位成员参与/)
assert.match(actionArea, /下次让 Team 做得更好 — 提一条改进意见/)
assert.match(actionArea, /提一条改进意见/)
assert.match(actionArea, /以这次为起点开新任务/)
assert.match(actionArea, /暂未启用/)
assert.match(actionArea, /backgroundImage: 'linear-gradient\(135deg, color-mix\(in srgb, var\(--success\) 11%, transparent\) 0%, var\(--surface\) 52%\)'/)
assert.doesNotMatch(actionArea, /以这次为起点，开新任务/)

console.log('room-done-state-regression: ok')
