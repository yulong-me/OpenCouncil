import { describe, expect, it } from 'vitest';
import {
  extractMessageMentions,
  extractUserMentions,
  findActiveMentionTrigger,
  insertMention,
} from '../../frontend/lib/mentions.ts';

describe('@mention helpers', () => {
  it('extracts inline user mentions for send routing', () => {
    expect(extractUserMentions('帮我看看这个方案 @架构师')).toEqual(['架构师']);
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

  it('keeps the picker active only while typing the mention token', () => {
    expect(findActiveMentionTrigger('@架构师', '@架构师'.length)).toEqual({
      query: '架构师',
      start: 0,
    });
    expect(findActiveMentionTrigger('@架构师 继续说', '@架构师 继续说'.length)).toBeNull();
  });

  it('inserts a mention with a separating space when forced-picking from plain text', () => {
    const result = insertMention('帮我看一下这个方案', '帮我看一下这个方案'.length, '帮我看一下这个方案'.length, '架构师');

    expect(result).toEqual({
      nextValue: '帮我看一下这个方案 @架构师 ',
      nextCursor: '帮我看一下这个方案 @架构师 '.length,
    });
  });
});
