// Defensive JSON utilities for Anthropic tool-use responses.

/** Returns parsed value or null on any parse error. */
export function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type ContentBlock = { type: string; name?: string; input?: unknown };

/**
 * Extracts the `input` field of the first tool_use block whose name matches.
 * Returns null if not found or malformed.
 */
export function safeExtractToolInput(
  content: ContentBlock[],
  toolName: string,
): unknown | null {
  if (!Array.isArray(content)) return null;
  const block = content.find(b => b.type === 'tool_use' && b.name === toolName);
  return block?.input ?? null;
}
