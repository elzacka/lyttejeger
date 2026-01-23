// Lucide 'chevron-down' icon (MIT license) - self-hosted for GDPR compliance
import type { SVGProps } from 'react';

export interface ChevronIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const rotations = {
  up: 180,
  down: 0,
  left: 90,
  right: -90,
} as const;

export function ChevronIcon({ size = 24, direction = 'down', style, ...props }: ChevronIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: `rotate(${rotations[direction]}deg)`, ...style }}
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
