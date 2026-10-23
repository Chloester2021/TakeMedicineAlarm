// Keep the stored message format compatible with speech and notifications.
export const separateMessageTokens = message => message.replace(
  /(\{(?:day|date|time)\})(?=\{(?:day|date|time)\})/g, '$1 ',
);

export function messageParts(message = '') {
  const parts = [];
  let start = 0;
  for (const match of message.matchAll(/\{(day|date|time)\}/g)) {
    parts.push({ type: 'text', value: message.slice(start, match.index), start, end: match.index });
    start = match.index + match[0].length;
    parts.push({ type: 'token', value: match[1], start: match.index, end: start });
  }
  parts.push({ type: 'text', value: message.slice(start), start, end: message.length });
  return parts;
}

export function messageCaret(parts, offset) {
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (part.type === 'text' && offset <= part.end) {
      return { index, position: Math.max(0, offset - part.start) };
    }
  }
  const index = parts.length - 1;
  return { index, position: parts[index].value.length };
}
