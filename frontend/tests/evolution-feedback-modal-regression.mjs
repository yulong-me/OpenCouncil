import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const feedbackModal = readFileSync(resolve(root, 'components/room-view/EvolutionFeedbackModal.tsx'), 'utf8')
const roomView = readFileSync(resolve(root, 'components/RoomView.tsx'), 'utf8')

assert.match(feedbackModal, /teamName\?: string/)
assert.match(feedbackModal, /currentVersionNumber\?: number/)
assert.match(feedbackModal, /max-w-\[580px\]/)
assert.match(feedbackModal, /改进这支 Team/)
assert.match(feedbackModal, /\{currentVersionLabel\} → \{nextVersionLabel\}/)
assert.match(feedbackModal, /这支 Team <em>下次怎么做<\/em> 会更好/)
assert.match(feedbackModal, /maxLength=\{600\}/)
assert.match(feedbackModal, /\{draft\.length\} \/ 600/)
assert.match(feedbackModal, /系统会自动结合现场记录归纳出 Team 升级建议/)
assert.match(feedbackModal, /输出中…/)
assert.match(feedbackModal, /停止当前执行并生成改进/)

assert.match(roomView, /teamName=\{teamName\}/)
assert.match(roomView, /currentVersionNumber=\{teamVersionNumber\}/)

console.log('evolution-feedback-modal-regression: ok')
