import { useMemo } from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with:
 * - Decoded HTML entities
 * - Clickable links (both custom [[link:]] format and auto-detected URLs)
 * - Proper line breaks
 */
export function FormattedText({ text, className }: FormattedTextProps) {
  const parts = useMemo(() => parseAndFormatText(text), [text]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.type === 'link' ? (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--accent)',
              textDecoration: 'underline',
              wordBreak: 'break-word'
            }}
          >
            {part.text}
          </a>
        ) : part.type === 'break' ? (
          <br key={index} />
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

type TextPart =
  | { type: 'text'; text: string }
  | { type: 'link'; url: string; text: string }
  | { type: 'break' };

/**
 * Decode HTML entities and strip HTML tags
 */
function decodeHtmlEntities(text: string): string {
  // Create a temporary div to parse HTML
  const div = document.createElement('div');
  div.innerHTML = text;

  // Get text content (strips all HTML tags, keeps only text)
  const textContent = div.textContent || div.innerText || '';

  return textContent;
}

/**
 * Parse text with custom link format and auto-detect URLs
 */
function parseAndFormatText(text: string): TextPart[] {
  // First decode HTML entities
  let decoded = decodeHtmlEntities(text);

  // Remove excessive whitespace and normalize line breaks
  decoded = decoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const parts: TextPart[] = [];

  // Regex to match:
  // 1. Custom link format: [[link:url|text]]
  // 2. URLs: http(s)://...
  // 3. Timestamps with colons (e.g., "1:30", "12:00")
  const combinedRegex = /(\[\[link:([^|]+)\|([^\]]*)\]\])|(https?:\/\/[^\s<>"{}|\\^`\[\]]+)|(\n)/g;

  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(decoded)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textBefore = decoded.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', text: textBefore });
      }
    }

    if (match[1]) {
      // Custom link format [[link:url|text]]
      const url = match[2];
      const linkText = match[3] || url;
      parts.push({ type: 'link', url, text: linkText });
    } else if (match[4]) {
      // Auto-detected URL
      const url = match[4];
      // Shorten display text for long URLs
      const displayText = url.length > 50 ? url.substring(0, 47) + '...' : url;
      parts.push({ type: 'link', url, text: displayText });
    } else if (match[5]) {
      // Line break
      parts.push({ type: 'break' });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < decoded.length) {
    const remaining = decoded.slice(lastIndex);
    if (remaining) {
      parts.push({ type: 'text', text: remaining });
    }
  }

  return parts;
}
