import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const quickStart = readFileSync(resolve(root, 'components/room-view/EmptyRoomQuickStart.tsx'), 'utf8')
const sidebar = readFileSync(resolve(root, 'components/RoomListSidebar.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')
const agentPanel = readFileSync(resolve(root, 'components/AgentPanel.tsx'), 'utf8')
const layout = readFileSync(resolve(root, 'app/layout.tsx'), 'utf8')

assert.match(layout, /defaultTheme="light"/)
assert.match(layout, /enableSystem=\{false\}/)
assert.doesNotMatch(layout, /defaultTheme="system"/)

assert.match(sidebar, /OPEN · TEAM · COUNCIL/)
assert.match(sidebar, /选 Team · 进入现场/)
assert.match(sidebar, /border-dashed/)

assert.match(quickStart, /data-quick-start-room-avatar=\{dataAttribute === 'room' \? 'true' : undefined\}/)
assert.match(quickStart, /data-template-card-footer="true"/)
assert.match(quickStart, /toolLabel/)
assert.match(quickStart, /fallbackReadiness/)
assert.match(quickStart, /CLI 未配置/)
assert.match(quickStart, /待测试/)
assert.doesNotMatch(quickStart, /位专家/)

assert.match(roomView, /\{activeRoomId && \(\s*<AgentPanel/)
assert.doesNotMatch(agentPanel, /下一次现场|没有 Team 在现场|选择任务记录后显示 Team 成员/)

console.log('desktop-home-mainline-regression: ok')
