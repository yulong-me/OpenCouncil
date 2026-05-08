import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const agentPanel = readFileSync(resolve(root, 'components/AgentPanel.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')

assert.match(agentPanel, /role="dialog"/)
assert.match(agentPanel, /aria-modal="true"/)
assert.match(agentPanel, /w-\[min\(320px,calc\(100vw-3rem\)\)\]/)
assert.match(agentPanel, /teamName/)
assert.match(agentPanel, /teamVersionNumber/)
assert.match(agentPanel, /邀请 Agent 参与任务/)
assert.match(agentPanel, /showHeader=\{false\}/)
assert.match(agentPanel, /showExtras=\{false\}/)
assert.match(roomView, /teamName=\{teamName\}/)
assert.match(roomView, /teamVersionNumber=\{teamVersionNumber\}/)
assert.match(roomView, /onOpenInviteDrawer=\{openInviteDrawer\}/)

console.log('mobile-agent-drawer-uiux-regression: ok')
