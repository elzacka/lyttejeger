import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * ChapterListIcon - Represents chapters/table of contents
 * Based on Lucide table-of-contents icon (MIT license)
 */
export function ChapterListIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 12H3" />
      <path d="M16 18H3" />
      <path d="M16 6H3" />
      <path d="M21 6h.01" />
      <path d="M21 12h.01" />
      <path d="M21 18h.01" />
    </svg>
  );
}
