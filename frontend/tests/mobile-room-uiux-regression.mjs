import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roomHeader = readFileSync(resolve(root, 'components/room-view/RoomHeader.tsx'), 'utf8')
const messageList = readFileSync(resolve(root, 'components/MessageList.tsx'), 'utf8')
const roomActionArea = readFileSync(resolve(root, 'components/room-view/RoomActionArea.tsx'), 'utf8')
const roomComposer = readFileSync(resolve(root, 'components/RoomComposer.tsx'), 'utf8')

assert.match(roomHeader, /sm:hidden[\s\S]*teamName[\s\S]*teamVersionNumber/)
assert.match(messageList, /px-3 py-4 space-y-4 md:px-8 md:py-6 md:space-y-6/)
assert.match(messageList, /max-w-\[82%\] md:max-w-\[720px\]/)
assert.match(messageList, /ml-4 md:ml-6/)
assert.match(messageList, /min-w-0 flex-1 md:max-w-\[760px\]/)
assert.match(messageList, /gap-2 pr-2 mb-4 items-start md:mb-6 md:gap-3 md:pr-0/)
assert.match(roomActionArea, /px-3 py-2 md:px-8 md:py-4/)
assert.match(roomComposer, /min-h-10 md:min-h-16/)
assert.match(roomComposer, /hidden md:inline/)
assert.match(roomComposer, /rounded-full md:rounded-lg/)

console.log('mobile-room-uiux-regression: ok')
