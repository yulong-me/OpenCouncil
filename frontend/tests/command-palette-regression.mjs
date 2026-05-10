import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'components/RoomListSidebar.tsx'), 'utf8')

assert.match(source, /max-w-\[640px\]/)
assert.match(source, /rounded-\[14px\]/)
assert.match(source, /ESC 关闭/)
assert.match(source, /任务记录 · \{roomResults\.length\} 条匹配/)
assert.match(source, /消息预览/)
assert.match(source, /highlightCommandMatch/)
assert.match(source, /data-command-palette-active/)
assert.match(source, /↑↓/)
assert.match(source, /浏览/)
assert.match(source, /↵/)
assert.match(source, /打开/)
assert.match(source, /⌘↵/)
assert.match(source, /在新窗口打开/)
assert.match(source, /itemCount/)
assert.doesNotMatch(source, /任务记录 \/ 最近消息/)

console.log('command-palette-regression: ok')
