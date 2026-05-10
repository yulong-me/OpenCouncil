import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const quickStart = readFileSync(resolve(root, 'components/room-view/EmptyRoomQuickStart.tsx'), 'utf8')
const roomHeader = readFileSync(resolve(root, 'components/room-view/RoomHeader.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')

assert.match(roomHeader, /onOpenSystemSettings/)
assert.match(roomHeader, /!roomId \? 'OpenCouncil'/)
assert.match(roomHeader, /aria-label="打开设置"/)
assert.match(roomView, /onOpenSystemSettings=\{openSystemSettings\}/)

assert.match(quickStart, /flex min-h-0 flex-1 flex-col overflow-hidden/)
assert.match(quickStart, /pb-24 md:pb-0/)
assert.match(quickStart, /text-\[30px\][^"]*md:text-\[52px\]/)
assert.match(quickStart, /grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3/)
assert.match(quickStart, /md:hidden[\s\S]*发起任务[\s\S]*ArrowRight/)
assert.doesNotMatch(quickStart, /grid gap-3 sm:grid-cols-2 xl:grid-cols-3/)

console.log('mobile-home-uiux-regression: ok')
