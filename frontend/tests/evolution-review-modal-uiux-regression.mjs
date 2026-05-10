import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modal = readFileSync(resolve(root, 'components/room-view/EvolutionReviewModal.tsx'), 'utf8')

assert.match(modal, /max-w-\[880px\]/)
assert.match(modal, /max-h-\[800px\]/)
assert.match(modal, />升级确认</)
assert.match(modal, /已处理 \{reviewedCount\} \/ \{proposal\.changes\.length\}/)
assert.match(modal, /已采纳 <b/)
assert.match(modal, /待处理 <b/)
assert.match(modal, /data-testid="evolution-review-progress"/)
assert.match(modal, /grid shrink-0 gap-2 border-b border-line\/70 bg-surface-muted px-4 py-3 sm:px-6 md:grid-cols-\[auto_minmax\(0,1fr\)_auto\]/)
assert.match(modal, /h-1\.5 w-full min-w-0 overflow-hidden/)
assert.match(modal, /auto-rows-min gap-2 self-start/)
assert.match(modal, /inline-flex h-10 min-h-10/)
assert.match(modal, /bg-accent[\s\S]*text-on-accent/)
assert.match(modal, /当前这一条/)
assert.match(modal, /升级摘要/)
assert.match(modal, /生效范围：<b>新任务<\/b> · 旧记录不受影响/)
assert.match(modal, /w-\[320px\]/)
assert.match(modal, /确认升级 Team · 还需处理 \{remainingCount\} 条/)
assert.doesNotMatch(modal, /fixed inset-0 layer-modal overflow-auto bg-nav-bg text-ink/)

console.log('evolution-review-modal-uiux-regression: ok')
