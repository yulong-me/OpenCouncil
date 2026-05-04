import assert from 'node:assert/strict'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MessageList } from '../components/MessageList'
import type { Agent, Message } from '../lib/agents'

const agent: Agent = {
  id: 'video-renderer',
  role: 'WORKER',
  name: '视频渲染器',
  domainLabel: '视频生成',
  status: 'idle',
}

const message: Message = {
  id: 'msg-media',
  agentRole: 'WORKER',
  agentName: agent.name,
  content: [
    '最终交付：',
    '视频路径 /Users/yulong/work/OpenCouncil/backend/workspaces/room-1/final.mp4',
    '音频路径 `/Users/yulong/work/OpenCouncil/backend/workspaces/room-1/voice over.m4a`',
  ].join('\n'),
  timestamp: new Date('2026-05-01T12:00:00+08:00').getTime(),
  type: 'assistant',
  duration_ms: 1200,
}

const markup = renderToStaticMarkup(
  <MessageList
    roomId="room-media"
    messages={[message]}
    agents={[agent]}
    state="DONE"
    sending={false}
    messageErrorMap={{}}
    orphanErrors={[]}
    showScrollBtn={false}
    containerRef={createRef<HTMLDivElement>()}
    onScroll={() => {}}
    onScrollToBottom={() => {}}
    onPrefillMention={() => {}}
    onRetryFailedMessage={() => {}}
    onRestoreFailedInput={() => {}}
    onCopyFailedPrompt={() => {}}
    onTryAnotherAgent={() => {}}
  />,
)

assert.match(markup, /<video[^>]+controls/)
assert.match(markup, /<audio[^>]+controls/)
assert.match(markup, /视频文件 · final\.mp4/)
assert.match(markup, /音频文件 · voice over\.m4a/)
assert.match(markup, /\/api\/browse\/media\?path=%2FUsers%2Fyulong%2Fwork%2FOpenCouncil/)

console.log('message-media-attachment-regression: ok')
