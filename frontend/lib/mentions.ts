const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g

function stripCodeBlocks(content: string): string {
  return content.replace(CODE_BLOCK_PATTERN, '')
}

function dedupePush(seen: Set<string>, names: string[], rawName: string) {
  const name = rawName.trim()
  if (!name || seen.has(name)) return
  seen.add(name)
  names.push(name)
}

export function extractMessageMentions(content: string): string[] {
  const sanitized = stripCodeBlocks(content)
  const seen = new Set<string>()
  const names: string[] = []

  const mdLinkPattern = /\[@([^\]]+)\]\([^)]+\)/g
  let match: RegExpExecArray | null
  while ((match = mdLinkPattern.exec(sanitized)) !== null) {
    dedupePush(seen, names, match[1])
  }

  const lineStartPattern = /(?:^|\n)[ \t]*@([a-zA-Z\u4e00-\u9fff·_-][a-zA-Z0-9\u4e00-\u9fff·_-]{0,39})/g
  while ((match = lineStartPattern.exec(sanitized)) !== null) {
    dedupePush(seen, names, match[1])
  }

  return names
}

export function extractUserMentions(content: string): string[] {
  const sanitized = stripCodeBlocks(content)
  const seen = new Set<string>()
  const names: string[] = []
  const inlinePattern = /(?:^|[\s(（【\[])@([a-zA-Z\u4e00-\u9fff·_-][a-zA-Z0-9\u4e00-\u9fff·_-]{0,39})/g

  let match: RegExpExecArray | null
  while ((match = inlinePattern.exec(sanitized)) !== null) {
    dedupePush(seen, names, match[1])
  }

  return names
}

export interface ActiveMention {
  query: string
  start: number
}

export function findActiveMentionTrigger(input: string, cursor: number): ActiveMention | null {
  const textBeforeCursor = input.slice(0, cursor)
  const lineStart = textBeforeCursor.lastIndexOf('\n') + 1
  const textOnLine = textBeforeCursor.slice(lineStart)
  const match = /(?:^|[\s(（【\[])@([^\s@]*)$/.exec(textOnLine)

  if (!match) return null

  const query = match[1]
  const atOffset = textOnLine.length - query.length - 1
  return {
    query,
    start: lineStart + atOffset,
  }
}

export function insertMention(input: string, start: number, end: number, agentName: string): { nextValue: string; nextCursor: number } {
  const before = input.slice(0, start)
  const after = input.slice(end).replace(/^\s+/, '')
  const needsLeadingSpace = before.length > 0 && !/\s$/.test(before)
  const mentionText = `${needsLeadingSpace ? ' ' : ''}@${agentName}`
  const trailingText = after.length > 0 ? ` ${after}` : ' '
  const nextValue = `${before}${mentionText}${trailingText}`
  const nextCursor = (before + mentionText + ' ').length

  return { nextValue, nextCursor }
}
