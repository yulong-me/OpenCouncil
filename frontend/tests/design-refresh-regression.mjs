import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const globalsCss = readFileSync(resolve(root, 'app/globals.css'), 'utf8')
const sidebar = readFileSync(resolve(root, 'components/RoomListSidebar.tsx'), 'utf8')
const composer = readFileSync(resolve(root, 'components/RoomComposer.tsx'), 'utf8')
const messageList = readFileSync(resolve(root, 'components/MessageList.tsx'), 'utf8')
const actionArea = readFileSync(resolve(root, 'components/room-view/RoomActionArea.tsx'), 'utf8')
const roomHeader = readFileSync(resolve(root, 'components/room-view/RoomHeader.tsx'), 'utf8')
const agentPanel = readFileSync(resolve(root, 'components/AgentPanel.tsx'), 'utf8')
const bubbleSection = readFileSync(resolve(root, 'components/BubbleSection.tsx'), 'utf8')

assert.match(globalsCss, /font-family: 'Inter', 'Noto Sans SC'/)
assert.match(globalsCss, /'JetBrains Mono'/)
assert.doesNotMatch(globalsCss, /Bricolage Grotesque/)
assert.doesNotMatch(globalsCss, /ambient-glow-float/)
assert.doesNotMatch(globalsCss, /ambient-ring-drift/)
assert.match(globalsCss, /--accent-contrast:\s*#FFFFFF/i)
assert.match(globalsCss, /--accent-contrast:\s*#15140F/i)
assert.match(globalsCss, /\.text-on-accent\s*\{[\s\S]*color: var\(--accent-contrast\);/)
assert.match(globalsCss, /--provider-opencode:\s*#7C3AED/i)
assert.match(globalsCss, /--provider-codex:\s*#0E8345/i)

assert.match(sidebar, /任务记录/)
assert.match(sidebar, /已归档/)
assert.match(sidebar, /发起任务/)
assert.match(sidebar, /⌘K/)
assert.match(sidebar, /data-command-palette="true"/)
assert.match(sidebar, /搜索任务记录、最近消息或操作/)

assert.match(composer, /告诉 Team 这次要做什么/)
assert.match(composer, /先 @ 选择一位 Team 成员/)
assert.match(composer, /focus-within:border-accent focus-within:ring-2 focus-within:ring-accent\/\[0\.22\]/)
assert.match(composer, /hover:border-accent\/55 hover:text-accent/)
assert.match(composer, /aria-label="@点名"/)
assert.match(composer, /aria-label="附件"/)
assert.match(composer, /aria-label="Skill"/)
assert.match(composer, /⌘↵ 发送 · ⇧↵ 换行/)
assert.match(composer, /↵ 发送/)
assert.match(composer, /↵ 选择/)
assert.doesNotMatch(composer, /Cmd\+Enter 发送/)

assert.match(messageList, /A2AHandoffInfo/)
assert.match(messageList, /由 @\{handoffInfo\.fromAgentName\} 召唤/)
assert.match(messageList, /getStreamingStatusLabel/)
assert.match(messageList, /tone-focus-dot inline-block h-1\.5 w-1\.5 rounded-full animate-focus-pulse/)
assert.doesNotMatch(messageList, /● 回答中/)
assert.match(bubbleSection, /tabIndex=\{-1\}/)

assert.match(roomHeader, /renaming && roomId && suggestionsOpen/)
assert.doesNotMatch(roomHeader, /roomId && \(\s*<button\s+type="button"\s+onClick=\{\(\) => \{ void handleGenerateTitleSuggestions\(\) \}\}/)

assert.doesNotMatch(actionArea, /导出任务报告|discussion-report|Download/)
assert.match(agentPanel, /Team 成员/)
assert.doesNotMatch(agentPanel, /📋/)

const accentContrastSources = [
  sidebar,
  composer,
  messageList,
  actionArea,
  roomHeader,
  agentPanel,
  bubbleSection,
  readFileSync(resolve(root, 'components/CreateRoomModal.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/DirectoryBrowser.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/WorkspaceSidebar.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/AgentInviteDrawer.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/room-view/DepthSwitcher.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/room-view/EvolutionFeedbackModal.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/room-view/EvolutionReviewModal.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/room-view/EmptyRoomQuickStart.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/settings-modal/ProviderSettingsTab.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/settings-modal/SkillSettingsTab.tsx'), 'utf8'),
  readFileSync(resolve(root, 'components/settings-modal/TeamSettingsTab.tsx'), 'utf8'),
]

for (const source of accentContrastSources) {
  assert.doesNotMatch(source, /bg-accent[^\n]*text-white|text-white[^\n]*bg-accent/)
}

console.log('design-refresh-regression: ok')
