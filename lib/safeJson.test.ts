import { safeParseJson, safeExtractToolInput } from './safeJson';

describe('safeParseJson', () => {
  it('parses valid JSON object', () => {
    expect(safeParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses valid JSON array', () => {
    expect(safeParseJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('parses JSON number', () => {
    expect(safeParseJson('42')).toBe(42);
  });

  it('returns null for invalid JSON', () => {
    expect(safeParseJson('not json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeParseJson('')).toBeNull();
  });

  it('returns null for truncated JSON', () => {
    expect(safeParseJson('{"score": 14')).toBeNull();
  });

  it('returns null for JSON with trailing comma', () => {
    expect(safeParseJson('{"a":1,}')).toBeNull();
  });
});

describe('safeExtractToolInput', () => {
  const validContent = [
    { type: 'text', text: 'some text' },
    { type: 'tool_use', name: 'submit_grade', input: { scores: { fluency: 14 } } },
  ];

  it('extracts input from matching tool_use block', () => {
    expect(safeExtractToolInput(validContent, 'submit_grade')).toEqual({ scores: { fluency: 14 } });
  });

  it('returns null when tool name does not match', () => {
    expect(safeExtractToolInput(validContent, 'wrong_tool')).toBeNull();
  });

  it('returns null for empty content array', () => {
    expect(safeExtractToolInput([], 'submit_grade')).toBeNull();
  });

  it('returns null for non-array content', () => {
    expect(safeExtractToolInput(null as any, 'submit_grade')).toBeNull();
    expect(safeExtractToolInput(undefined as any, 'submit_grade')).toBeNull();
  });

  it('returns null when no tool_use blocks present', () => {
    expect(safeExtractToolInput([{ type: 'text' } as any], 'submit_grade')).toBeNull();
  });

  it('returns null when tool_use has no input field', () => {
    const content = [{ type: 'tool_use', name: 'submit_grade' }];
    expect(safeExtractToolInput(content, 'submit_grade')).toBeNull();
  });

  it('picks the first matching block when there are multiple tool_use blocks', () => {
    const content = [
      { type: 'tool_use', name: 'submit_grade', input: { first: true } },
      { type: 'tool_use', name: 'submit_grade', input: { first: false } },
    ];
    expect(safeExtractToolInput(content, 'submit_grade')).toEqual({ first: true });
  });
});
