import { describe, expect, it } from 'vitest';
import {
  extractMessageMentions,
  extractUserMentions,
  extractUserMentionsFromAgents,
  findActiveMentionTrigger,
  insertMention,
} from '../../frontend/lib/mentions.ts';

describe('@mention helpers', () => {
  it('extracts inline user mentions for send routing', () => {
    expect(extractUserMentions('帮我看看这个方案 @架构师')).toEqual(['架构师']);
  });

  it('matches room agents with spaces in their names', () => {
    expect(
      extractUserMentionsFromAgents('请 @Paul Graham 和 @Andrej Karpathy 看下', ['Paul Graham', 'Andrej Karpathy']),
    ).toEqual(['Paul Graham', 'Andrej Karpathy']);
  });

  it('matches mention names with middle-dot variants and full-width @', () => {
    expect(
      extractUserMentionsFromAgents(
        '＠查理・芒格 你怎么看苹果折叠屏',
        ['查理·芒格', '理查德·费曼'],
      ),
    ).toEqual(['查理·芒格']);
  });

  it('ignores inline and code-block mentions when parsing routed message mentions', () => {
    const content = [
      '先引用一下 @乔布斯 的说法',
      '```ts',
      '@架构师 这行只是代码',
      '```',
      '@测试员 请继续',
    ].join('\n');

    expect(extractMessageMentions(content)).toEqual(['测试员']);
  });

  it('extracts routed mentions with dotted names from room agent roster', () => {
    const content = [
      '@查理・芒格 你先回答',
      '@理查德·费曼 你补充',
    ].join('\n');

    expect(
      extractMessageMentions(content, ['查理·芒格', '理查德·费曼', '乔布斯']),
    ).toEqual(['查理·芒格', '理查德·费曼']);
  });

  it('keeps the picker active only while typing the mention token', () => {
    expect(findActiveMentionTrigger('@架构师', '@架构师'.length, ['架构师'])).toEqual({
      query: '架构师',
      start: 0,
    });
    expect(findActiveMentionTrigger('@Paul Gr', '@Paul Gr'.length, ['Paul Graham'])).toEqual({
      query: 'Paul Gr',
      start: 0,
    });
    expect(findActiveMentionTrigger('@架构师 继续说', '@架构师 继续说'.length, ['架构师'])).toBeNull();
  });

  it('inserts a mention with a separating space when forced-picking from plain text', () => {
    const result = insertMention('帮我看一下这个方案', '帮我看一下这个方案'.length, '帮我看一下这个方案'.length, '架构师');

    expect(result).toEqual({
      nextValue: '帮我看一下这个方案 @架构师 ',
      nextCursor: '帮我看一下这个方案 @架构师 '.length,
    });
  });
});
