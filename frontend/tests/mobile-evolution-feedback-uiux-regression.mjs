import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const feedbackModal = readFileSync(resolve(root, 'components/room-view/EvolutionFeedbackModal.tsx'), 'utf8')

assert.match(feedbackModal, /role="dialog"/)
assert.match(feedbackModal, /aria-modal="true"/)
assert.match(feedbackModal, /aria-labelledby="evolution-feedback-title"/)
assert.match(feedbackModal, /feedbackTextareaRef\.current\?\.focus\(\)/)
assert.match(feedbackModal, /ref=\{feedbackTextareaRef\}/)
assert.match(feedbackModal, /event\.key === 'Escape'[\s\S]*onClose\(\)/)
assert.match(feedbackModal, /event\.key !== 'Tab'/)
assert.match(feedbackModal, /items-end sm:items-start/)
assert.match(feedbackModal, /max-h-\[80dvh\]/)
assert.match(feedbackModal, /rounded-t-\[16px\] rounded-b-none sm:rounded-\[14px\]/)
assert.match(feedbackModal, /h-1 w-9 rounded-full/)
assert.match(feedbackModal, /min-h-0 flex-1 overflow-y-auto/)
assert.match(feedbackModal, /order-2 sm:order-1/)
assert.match(feedbackModal, /order-1 .* sm:order-2/)
assert.match(feedbackModal, /hidden h-9 .* sm:inline-flex/)
assert.match(feedbackModal, /w-full .* sm:w-auto/)

console.log('mobile-evolution-feedback-uiux-regression: ok')
