const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g

function stripCodeBlocks(content: string): string {
  return content.replace(CODE_BLOCK_PATTERN, '')
}

const MENTION_SEPARATOR_CHARS = /[·・•‧⋅･.．。]/u

function isAtSymbol(char: string | undefined): boolean {
  return char === '@' || char === '＠'
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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildAgentMentionPattern(agentName: string): RegExp {
  let pattern = '^'

  for (const char of agentName.trim()) {
    if (/\s/u.test(char)) {
      pattern += '\\s+'
      continue
    }
    if (MENTION_SEPARATOR_CHARS.test(char)) {
      // Allow dot-like separators to be typed in multiple forms, as space, or omitted.
      pattern += '[·・•‧⋅･.．。\\s]*'
      continue
    }
    pattern += escapeRegExp(char)
  }

  return new RegExp(pattern, 'iu')
}

interface AgentMatcher {
  name: string
  pattern: RegExp
}

function buildAgentMatchers(agentNames: string[]): AgentMatcher[] {
  const seen = new Set<string>()
  const uniqueNames = agentNames
    .map((name) => name.trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false
      seen.add(name)
      return true
    })
    .sort((a, b) => b.length - a.length)

  return uniqueNames.map((name) => ({ name, pattern: buildAgentMentionPattern(name) }))
}

function isLineStartMentionAt(content: string, atIdx: number): boolean {
  const lineStart = content.lastIndexOf('\n', atIdx - 1) + 1
  return /^[ \t]*$/u.test(content.slice(lineStart, atIdx))
}

function matchMentionsByAgents(
  content: string,
  agentNames: string[],
  lineStartOnly: boolean,
): string[] {
  if (agentNames.length === 0) return []

  const seen = new Set<string>()
  const names: string[] = []
  const matchers = buildAgentMatchers(agentNames)

  for (let i = 0; i < content.length; i += 1) {
    if (!isAtSymbol(content[i])) continue
    if (!lineStartOnly && !isMentionLeadBoundary(content[i - 1])) continue
    if (lineStartOnly && !isLineStartMentionAt(content, i)) continue

    const rest = content.slice(i + 1)
    let matchedName: string | null = null
    let consumed = 0
    for (const matcher of matchers) {
      const result = matcher.pattern.exec(rest)
      if (!result) continue
      const matchedLength = result[0].length
      if (matchedLength <= 0 || !isMentionTailBoundary(rest[matchedLength])) continue
      matchedName = matcher.name
      consumed = matchedLength
      break
    }

    if (!matchedName) continue

    dedupePush(seen, names, matchedName)
    i += consumed
  }

  return names
}

function dedupePush(seen: Set<string>, names: string[], rawName: string) {
  const name = rawName.trim()
  if (!name || seen.has(name)) return
  seen.add(name)
  names.push(name)
}

export function extractMessageMentions(content: string, agentNames: string[] = []): string[] {
  const sanitized = stripCodeBlocks(content)
  const seen = new Set<string>()
  const names: string[] = []

  const mdLinkPattern = /\[@([^\]]+)\]\([^)]+\)/g
  let match: RegExpExecArray | null
  while ((match = mdLinkPattern.exec(sanitized)) !== null) {
    dedupePush(seen, names, match[1])
  }

  if (agentNames.length > 0) {
    const matched = matchMentionsByAgents(sanitized, agentNames, true)
    for (const name of matched) {
      dedupePush(seen, names, name)
    }
    return names
  }

  // Find @ at line-start, then greedily match valid characters until a boundary is hit.
  // This handles agent names with middle-dots (·) and hyphens correctly.
  const lineStartRegex = /(?:^|\n)[ \t]*[@＠]/g
  while ((match = lineStartRegex.exec(sanitized)) !== null) {
    const startIdx = match.index + match[0].length
    let endIdx = startIdx
    while (endIdx < sanitized.length && !isMentionTailBoundary(sanitized[endIdx])) {
      endIdx++
    }
    const rawName = sanitized.slice(startIdx, endIdx)
    // Only accept if name has at least 1 valid char and starts with Chinese/letter
    if (rawName.length > 0 && /[a-zA-Z\u4e00-\u9fff]/.test(rawName[0])) {
      dedupePush(seen, names, rawName)
    }
  }

  return names
}

export function extractUserMentions(content: string): string[] {
  const sanitized = stripCodeBlocks(content)
  const seen = new Set<string>()
  const names: string[] = []
  const fallbackInlinePattern = /(?:^|[\s(（【\[])[@＠]([a-zA-Z\u4e00-\u9fff·・•‧⋅･._-][a-zA-Z0-9\u4e00-\u9fff·・•‧⋅･._-]{0,39})/g

  let match: RegExpExecArray | null
  while ((match = fallbackInlinePattern.exec(sanitized)) !== null) {
    dedupePush(seen, names, match[1])
  }

  return names
}

export function extractUserMentionsFromAgents(content: string, agentNames: string[]): string[] {
  const sanitized = stripCodeBlocks(content)
  return matchMentionsByAgents(sanitized, agentNames, false)
}

export interface ActiveMention {
  query: string
  start: number
}

export function findActiveMentionTrigger(input: string, cursor: number, agentNames: string[] = []): ActiveMention | null {
  const textBeforeCursor = input.slice(0, cursor)
  const lineStart = textBeforeCursor.lastIndexOf('\n') + 1
  const textOnLine = textBeforeCursor.slice(lineStart)
  const match = /(?:^|[\s(（【\[])[@＠]([^@＠]*)$/.exec(textOnLine)

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
