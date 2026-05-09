import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const createRoom = readFileSync(resolve(root, 'components/CreateRoomModal.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')

// 1. The existing-Team modal should sit inside the desktop main area, below the top edge,
// not cover the left task sidebar with a full-window centered overlay.
assert.match(roomView, /desktopOffset=\{taskPanelCollapsed \? 0 : taskPanelWidth\}/)
assert.match(createRoom, /desktopOffset = 0/)
assert.match(createRoom, /md:left-\[var\(--create-room-modal-left\)\]/)
assert.match(createRoom, /items-start justify-center px-4/)
assert.match(createRoom, /teamDraftOpen \? 'py-9' : 'py-14'/)
assert.match(createRoom, /max-h-\[calc\(100dvh-7rem\)\]/)
assert.doesNotMatch(createRoom, /fixed inset-0 layer-modal flex items-stretch justify-center p-4/)

// 3. Tabs stay lightweight and text-only at the same level; no Plus icon in the tab label.
assert.match(createRoom, /data-create-room-tab="select-team"/)
assert.match(createRoom, /data-create-room-tab="generate-team"/)
assert.doesNotMatch(createRoom, /<Plus[\s\S]{0,160}生成新 Team/)

// 6. Team members are shown as an avatar stack plus role summary, not loose name pills.
assert.match(createRoom, /data-create-room-member-avatar="true"/)
assert.match(createRoom, /selectedTeamMemberRoles/)
assert.doesNotMatch(createRoom, /selectedTeam\.members\.slice\(0, 4\)\.map\(member => \(\s*<span key=\{member\.id\} className="rounded-full border border-line bg-surface-muted px-2 py-0\.5/)

// 7. Provider readiness is rendered as tool cards with path/test detail.
assert.match(createRoom, /data-create-room-tool-card="true"/)
assert.match(createRoom, /getProviderPathLabel\(readiness\)/)
assert.match(createRoom, /resolvedPath \|\| readiness\.cliPath/)

// 8. Workspace collapsed row matches the prototype: chevron-right, folder icon, title, and hint.
assert.match(createRoom, /ChevronRight/)
assert.match(createRoom, /Folder/)
assert.match(createRoom, /工作目录（可选）/)
assert.match(createRoom, /留空则用默认临时工作区/)
assert.doesNotMatch(createRoom, /ChevronDown className=\{`w-3\.5 h-3\.5 transition-transform \$\{workspaceOpen \? 'rotate-180' : ''\}`\}/)

// 9/10. Footer is left preflight + right cancel/primary actions; primary uses an ArrowRight suffix.
assert.match(createRoom, /data-create-room-footer-status="preflight"/)
assert.match(createRoom, /data-create-room-footer-actions="true"/)
assert.match(createRoom, /取消/)
assert.match(createRoom, /ArrowRight/)
assert.match(createRoom, /进入协作现场[\s\S]{0,140}<ArrowRight/)
assert.doesNotMatch(createRoom, /<Play className="w-4 h-4 fill-current"/)

console.log('create-room-existing-team-uiux-regression: ok')
