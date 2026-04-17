const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g

function stripCodeBlocks(content: string): string {
  return content.replace(CODE_BLOCK_PATTERN, '')
}

function isMentionLeadBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s(（【\[]/.test(char)
}

function isMentionTailBoundary(char: string | undefined): boolean {
  return char === undefined || /[\s)\]】}>,.!?;:，。！？；：]/.test(char)
}

function startsWithIgnoreCase(text: string, prefix: string): boolean {
  return text.slice(0, prefix.length).toLocaleLowerCase() === prefix.toLocaleLowerCase()
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
  const fallbackInlinePattern = /(?:^|[\s(（【\[])@([a-zA-Z\u4e00-\u9fff·_-][a-zA-Z0-9\u4e00-\u9fff·_-]{0,39})/g

  let match: RegExpExecArray | null
  while ((match = fallbackInlinePattern.exec(sanitized)) !== null) {
    dedupePush(seen, names, match[1])
  }

  return names
}

export function extractUserMentionsFromAgents(content: string, agentNames: string[]): string[] {
  const sanitized = stripCodeBlocks(content)
  const seen = new Set<string>()
  const names: string[] = []
  const sortedAgentNames = [...agentNames].sort((a, b) => b.length - a.length)

  for (let i = 0; i < sanitized.length; i += 1) {
    if (sanitized[i] !== '@' || !isMentionLeadBoundary(sanitized[i - 1])) continue

    const rest = sanitized.slice(i + 1)
    const matchedName = sortedAgentNames.find((agentName) =>
      startsWithIgnoreCase(rest, agentName) && isMentionTailBoundary(rest[agentName.length]),
    )

    if (!matchedName) continue

    dedupePush(seen, names, matchedName)
    i += matchedName.length
  }

  return names
}

export interface ActiveMention {
  query: string
  start: number
}

export function findActiveMentionTrigger(input: string, cursor: number, agentNames: string[] = []): ActiveMention | null {
  const textBeforeCursor = input.slice(0, cursor)
  const lineStart = textBeforeCursor.lastIndexOf('\n') + 1
  const textOnLine = textBeforeCursor.slice(lineStart)
  const match = /(?:^|[\s(（【\[])@([^@]*)$/.exec(textOnLine)

  if (!match) return null

  const query = match[1]
  if (agentNames.length > 0) {
    const hasPrefixMatch = query.length === 0 || agentNames.some((agentName) => startsWithIgnoreCase(agentName, query))
    if (!hasPrefixMatch) return null
  }
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
