import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const agentPanel = readFileSync(resolve(root, 'components/AgentPanel.tsx'), 'utf8')
const directoryBrowser = readFileSync(resolve(root, 'components/DirectoryBrowser.tsx'), 'utf8')
const workspacePreview = readFileSync(resolve(root, 'components/WorkspacePreviewDialog.tsx'), 'utf8')
const inviteDrawer = readFileSync(resolve(root, 'components/AgentInviteDrawer.tsx'), 'utf8')
const teamSettings = readFileSync(resolve(root, 'components/settings-modal/TeamSettingsTab.tsx'), 'utf8')

assert.match(agentPanel, /z-\[60\]/)
assert.doesNotMatch(agentPanel, /z-\[260\]/)
assert.match(directoryBrowser, /z-\[200\]/)
assert.match(inviteDrawer, /z-\[200\]/)
assert.match(workspacePreview, /z-\[220\]/)
assert.match(teamSettings, /z-\[120\]/)

console.log('layering-regression: ok')
