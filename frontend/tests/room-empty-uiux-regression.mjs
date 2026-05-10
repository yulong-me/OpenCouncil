import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const header = readFileSync(resolve(root, 'components/room-view/RoomHeader.tsx'), 'utf8')
const depthSwitcher = readFileSync(resolve(root, 'components/room-view/DepthSwitcher.tsx'), 'utf8')
const composer = readFileSync(resolve(root, 'components/RoomComposer.tsx'), 'utf8')
const actionArea = readFileSync(resolve(root, 'components/room-view/RoomActionArea.tsx'), 'utf8')
const agentPanel = readFileSync(resolve(root, 'components/AgentPanel.tsx'), 'utf8')
const workspaceSidebar = readFileSync(resolve(root, 'components/WorkspaceSidebar.tsx'), 'utf8')
const messageList = readFileSync(resolve(root, 'components/MessageList.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')

assert.ok(
  header.indexOf('aria-label="任务操作"') < header.indexOf('<DepthSwitcher') &&
    header.indexOf('<DepthSwitcher') < header.indexOf('提个改进') &&
    header.indexOf('提个改进') < header.indexOf('aria-label="系统布局"'),
  'Room header actions should visually separate task actions before system layout controls.',
)
assert.doesNotMatch(header, /邀请 Agent/)
assert.match(header, /data-control-scope="task"/)
assert.match(header, /data-control-scope="system"/)
assert.match(header, /aria-label="任务操作"/)
assert.match(header, /aria-label="系统布局"/)
assert.match(header, /onOpenTeamSettings/)
assert.match(header, /aria-label=\{`编辑 Team：\$\{teamName\}`\}/)
assert.match(header, /title="编辑 Team"/)
assert.match(header, /border-accent\/25 bg-accent\/\[0\.045\]/)
assert.match(header, /border-line bg-surface-muted\/70/)
assert.match(header, /<PanelLeft className="h-4 w-4"/)
assert.match(header, /<PanelRight className="h-4 w-4"/)
assert.match(header, /aria-pressed=\{!taskPanelCollapsed\}/)
assert.match(header, /aria-pressed=\{!agentPanelCollapsed\}/)
assert.doesNotMatch(header, /PanelLeft(?:Close|Open)|PanelRight(?:Close|Open)/)
assert.match(depthSwitcher, /aria-expanded=\{open\}/)
assert.match(depthSwitcher, /ChevronDown/)
assert.match(depthSwitcher, /跟随 Team/)
assert.match(depthSwitcher, /浅 \(3层\)/)
assert.match(depthSwitcher, /中 \(5层\)/)
assert.match(depthSwitcher, /深 \(10层\)/)
assert.doesNotMatch(depthSwitcher, /减少 A2A 接力深度/)
assert.doesNotMatch(depthSwitcher, /增加 A2A 接力深度/)

assert.doesNotMatch(composer, /data-recipient-ghost="true"/)
assert.doesNotMatch(composer, /先 @ 选一位 Team 成员/)
assert.match(composer, /@\$?\{?agents\[0\]\?\.name/)
assert.match(composer, /min-h-\[50px\]/)
assert.match(actionArea, /px-\[22px\]/)
assert.match(actionArea, /bg-bg px-\[22px\] py-\[14px\] pb-\[18px\]/)

assert.match(roomView, /AGENT_PANEL_DEFAULT_WIDTH = 308/)
assert.match(roomView, /AGENT_PANEL_MIN_WIDTH = 280/)
assert.match(roomView, /settingsInitialTeamId/)
assert.match(roomView, /openCurrentTeamSettings/)
assert.match(roomView, /initialTeamId=\{settingsInitialTeamId\}/)
assert.match(agentPanel, /style=\{\{ width: desktopCollapsed \? 0 : desktopWidth \}\}/)
assert.doesNotMatch(agentPanel, /border-l border-line bg-surface px-2 py-3/)
assert.doesNotMatch(agentPanel, /aria-label="展开 Team 成员面板"[\s\S]{0,240}ChevronLeft/)
assert.doesNotMatch(agentPanel, /onDesktopToggleCollapsed/)
assert.doesNotMatch(agentPanel, /邀请 Agent/)
assert.doesNotMatch(agentPanel, /onOpenInviteDrawer/)
assert.match(agentPanel, /TEAM 成员/)
assert.match(agentPanel, /right-panel-section/)
assert.match(agentPanel, /team-member-card/)
assert.match(agentPanel, /team-member-card-accent/)
assert.doesNotMatch(agentPanel, /rounded-\[9px\] border px-\[10px\] py-\[10px\]/)
assert.match(workspaceSidebar, /workspace-card-refined/)
assert.match(agentPanel, /RefreshCw/)
assert.doesNotMatch(agentPanel, /等待首轮上下文遥测/)
assert.doesNotMatch(agentPanel, /ID:\s*<\/span>/)
assert.match(agentPanel, /function formatAgentRoleLabel/)
assert.match(agentPanel, /size=\{18\} label=\{false\}/)
assert.doesNotMatch(agentPanel, /h-\[60px\] w-\[60px\]/)
assert.doesNotMatch(agentPanel, /border-transparent bg-transparent/)
assert.match(agentPanel, /hasEffectiveSkills/)
assert.match(agentPanel, /skillSummary\?\.effectiveSkills\.length/)
assert.ok(
  agentPanel.indexOf('<WorkspaceSidebar') < agentPanel.indexOf('aria-label={skillsCollapsed'),
  'Workspace should stay below members and before the compact Skills summary.',
)

assert.match(messageList, /flex min-h-full flex-1 items-center justify-center/)
assert.match(messageList, /text-\[14px\] leading-\[1\.6\]/)
assert.match(messageList, /const \[toolCallsOpen, setToolCallsOpen\] = useState\(false\)/)
assert.match(messageList, /aria-expanded=\{toolCallsOpen\}/)
assert.match(messageList, /toolCallsOpen &&/)

console.log('room-empty-uiux-regression: ok')
