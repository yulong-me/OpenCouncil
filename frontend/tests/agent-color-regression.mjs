import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const agentsLib = readFileSync(resolve(root, 'lib/agents.tsx'), 'utf8')
const messageList = readFileSync(resolve(root, 'components/MessageList.tsx'), 'utf8')
const agentPanel = readFileSync(resolve(root, 'components/AgentPanel.tsx'), 'utf8')
const mentionPicker = readFileSync(resolve(root, 'components/MentionPicker.tsx'), 'utf8')
const inviteDrawer = readFileSync(resolve(root, 'components/AgentInviteDrawer.tsx'), 'utf8')
const composer = readFileSync(resolve(root, 'components/RoomComposer.tsx'), 'utf8')

assert.match(agentsLib, /AGENT_COLOR_PALETTE/)
assert.match(agentsLib, /function getAgentColor/)
assert.doesNotMatch(agentsLib, /export const DEFAULT_AGENT_COLOR = \{ bg: '#1F3A8A'/)

for (const source of [messageList, agentPanel, mentionPicker, inviteDrawer, composer]) {
  assert.match(source, /getAgentColor/)
  assert.doesNotMatch(source, /AGENT_COLORS\[[^\]]+\]\s*(?:\|\||\?\?)\s*DEFAULT_AGENT_COLOR/)
}

console.log('agent-color-regression: ok')
