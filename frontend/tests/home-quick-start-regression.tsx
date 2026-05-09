import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  EmptyRoomQuickStart,
  QUICK_START_TEMPLATES,
} from '../components/room-view/EmptyRoomQuickStart'

const markup = renderToStaticMarkup(
  <EmptyRoomQuickStart
    onStartBlank={() => {}}
    onStartTemplate={() => {}}
    onContinueRoom={() => {}}
    recentRooms={[
      {
        id: 'room-recent',
        topic: '登录系统设计',
        createdAt: 1,
        updatedAt: 2,
        state: 'RUNNING',
        activityState: 'open',
        agentCount: 4,
        teamId: 'software-development',
        teamName: '软件开发 Team',
        teamVersionNumber: 1,
      },
    ]}
  />,
)

assert.match(markup, /OpenCouncil/)
assert.match(markup, /主线 · 任务 → Team → 现场 → 记录 → 改进/)
assert.match(markup, /发起一个任务，交给 Team 协作/)
assert.match(markup, /先选择一支 Team，进入协作现场后再告诉它这次要做什么/)
assert.match(markup, /继续上次的协作/)
assert.match(markup, /1 条进行中/)
assert.match(markup, /登录系统设计/)
assert.match(markup, /软件开发 Team · v1 · 4 成员/)
assert.match(markup, /data-quick-start-room-avatar="true"/)
assert.match(markup, /快速 Team 模板/)
assert.match(markup, /点选直接进入协作现场/)
assert.match(markup, /发起任务/)
assert.match(markup, /Claude Code · OpenCode · Codex CLI/)
assert.match(markup, /Codex CLI/)
assert.match(markup, /OpenCode CLI/)
assert.match(markup, /可用/)
assert.match(markup, /待测试/)
assert.match(markup, /CLI 未配置/)
assert.doesNotMatch(markup, /状态待检查/)
assert.doesNotMatch(markup, /4 位专家|5 位专家/)
assert.equal(QUICK_START_TEMPLATES.length, 5)
assert.deepEqual(QUICK_START_TEMPLATES.map(template => template.title), [
  '诉讼策略 Team',
  '竞品分析 Team',
  '论文返修 Team',
  '圆桌讨论 Team',
  '软件开发 Team',
])
assert.deepEqual(QUICK_START_TEMPLATES.map(template => template.teamId), [
  'litigation-strategy',
  'competitor-analysis',
  'paper-revision',
  'roundtable-forum',
  'software-development',
])
assert.ok(QUICK_START_TEMPLATES.every(template => template.agentIds.length >= 4))
assert.deepEqual(QUICK_START_TEMPLATES.map(template => template.agentIds), [
  ['litigation-case-mapper', 'litigation-evidence-strategist', 'litigation-opposing-counsel', 'litigation-risk-controller'],
  ['competitor-market-mapper', 'competitor-positioning-strategist', 'competitor-product-skeptic', 'competitor-gtm-operator'],
  ['paper-review-diagnoser', 'paper-methods-editor', 'paper-rebuttal-writer', 'paper-hostile-reviewer'],
  ['paul-graham', 'steve-jobs', 'zhang-yiming', 'munger', 'taleb'],
  ['dev-architect', 'dev-challenge-architect', 'dev-implementer', 'dev-reviewer'],
])
for (const template of QUICK_START_TEMPLATES) {
  assert.match(markup, new RegExp(template.title))
}
const legacyChineseTerm = '\u573a\u666f'
assert.doesNotMatch(markup, new RegExp(`专家会议|${legacyChineseTerm}|讨论室|选择讨论室后显示讨论成员`))

console.log('home-quick-start-regression: ok')
