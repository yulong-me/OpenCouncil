import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'components/CreateRoomModal.tsx'), 'utf8')

assert.match(source, /max-w-\[720px\]/)
assert.match(source, /font-display text-\[24px\]/)
assert.match(source, /rounded-t-lg/)
assert.match(source, /选择已有 Team/)
assert.match(source, /生成新 Team/)
assert.match(source, /选择一支 Team，进入协作现场后再输入这次要做的事/)
assert.match(source, /当前版本/)
assert.match(source, /执行工具/)
assert.match(source, /room preflight/)
assert.match(source, /rounded-xl border border-line bg-surface p-3/)
assert.match(source, /grid gap-2 sm:grid-cols-2/)
assert.match(source, /创建 Team 并进入现场/)
assert.doesNotMatch(source, /flex flex-col items-center p-4 rounded-2xl border-2/)
assert.doesNotMatch(source, /grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-2/)
assert.doesNotMatch(source, /w-12 h-12/)

console.log('create-room-agent-card-density-regression: ok')
