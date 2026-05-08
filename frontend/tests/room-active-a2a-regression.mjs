import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const messageList = readFileSync(resolve(root, 'components/MessageList.tsx'), 'utf8')
const outgoingQueue = readFileSync(resolve(root, 'components/OutgoingMessageQueue.tsx'), 'utf8')

assert.match(messageList, /data-a2a-handoff-rail="true"/)
assert.match(messageList, /接力 →/)
assert.match(messageList, /rounded-\[4px_12px_12px_12px\]/)
assert.match(messageList, /rounded-\[12px_12px_4px_12px\]/)
assert.match(messageList, /bg-ink px-4 py-3\.5 text-bg/)
assert.match(messageList, /输出中…/)
assert.match(messageList, /由 @\{handoffInfo\.fromAgentName\} 召唤/)
assert.doesNotMatch(messageList, /<span className="opacity-50 mr-0\.5">@点名<\/span>/)

assert.match(outgoingQueue, /排队中/)
assert.match(outgoingQueue, /border-dashed border-line/)
assert.match(outgoingQueue, /待发队列/)

console.log('room-active-a2a-regression: ok')
