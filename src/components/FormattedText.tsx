interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with clickable links
 * Links should be marked as [[link:url|text]] in the input
 */
export function FormattedText({ text, className }: FormattedTextProps) {
  const parts = parseTextWithLinks(text);

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
          >
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

type TextPart = { type: 'text'; text: string } | { type: 'link'; url: string; text: string };

function parseTextWithLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const linkRegex = /\[\[link:([^|]+)\|([^\]]*)\]\]/g;

  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    // Add the link
    parts.push({ type: 'link', url: match[1], text: match[2] || match[1] });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return parts;
}
