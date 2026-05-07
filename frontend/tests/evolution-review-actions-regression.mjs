import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modal = readFileSync(resolve(root, 'components/room-view/EvolutionReviewModal.tsx'), 'utf8')
const feedbackModal = readFileSync(resolve(root, 'components/room-view/EvolutionFeedbackModal.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')

assert.match(modal, /role="dialog"/)
assert.match(modal, /aria-modal="true"/)
assert.match(modal, /aria-labelledby="evolution-review-title"/)
assert.match(modal, /data-testid="evolution-review-modal"/)
assert.match(modal, /data-testid="evolution-review-queue"/)
assert.match(modal, /data-testid="evolution-change-list"/)
assert.match(modal, /data-testid="evolution-accept-current"/)
assert.match(modal, /data-testid="evolution-reject-current"/)
assert.match(modal, /data-testid="evolution-accept-all-pending"/)
assert.match(modal, /data-testid="evolution-reject-all-pending"/)
assert.match(modal, /data-testid="evolution-confirm-upgrade"/)
assert.match(modal, /逐条处理/)
assert.match(modal, /继续下一条/)
assert.match(modal, /保存并稍后处理/)
assert.match(modal, /focusTrapRef/)
assert.match(modal, /selectNextPendingChangeId/)
assert.match(modal, /handleCurrentDecision/)
assert.match(modal, /handleBulkDecision/)
assert.match(modal, /批量处理剩余建议/)
assert.match(modal, /采纳剩余/)
assert.match(modal, /不采纳剩余/)
assert.match(modal, /aria-live="polite"/)

assert.match(feedbackModal, /busyAgents/)
assert.match(feedbackModal, /data-testid="evolution-room-busy-warning"/)
assert.match(feedbackModal, /停止当前执行并生成改进/)
assert.match(feedbackModal, /当前还有/)
assert.match(roomView, /handleStopBusyAgentsAndCreateEvolution/)
assert.match(roomView, /onStopBusyAgentsAndSubmit/)

console.log('evolution-review-actions-regression: ok')
