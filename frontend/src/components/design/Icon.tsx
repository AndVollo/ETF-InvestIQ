import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'bucket'
  | 'deposit'
  | 'universe'
  | 'architect'
  | 'sectors'
  | 'drawdown'
  | 'audit'
  | 'settings'
  | 'chevronDown'
  | 'chevronRight'
  | 'plus'
  | 'sun'
  | 'moon'
  | 'panel'
  | 'calendar'
  | 'info'
  | 'check'
  | 'alert'
  | 'arrowDown'
  | 'refresh'
  | 'sparkle'
  | 'x'
  | 'database'
  | 'globe'
  | 'minus'
  | 'pencil'
  | 'trash'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

const PATHS: Record<IconName, JSX.Element> = {
  home:        <><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></>,
  bucket:      <><path d="M5 7h14l-1.5 12.5a2 2 0 01-2 1.75H8.5a2 2 0 01-2-1.75L5 7z"/><path d="M8 7V5a4 4 0 018 0v2"/></>,
  deposit:     <><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></>,
  universe:    <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></>,
  architect:   <><path d="M3 21l4-1 12-12-3-3L4 17l-1 4z"/><path d="M14 6l3 3"/></>,
  sectors:     <><path d="M4 20V10M10 20V4M16 20v-8M22 20v-6"/></>,
  drawdown:    <><path d="M3 7l5 6 4-3 5 5 4-7"/><path d="M3 19h18"/></>,
  audit:       <><path d="M7 4h7l4 4v12a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M14 4v4h4"/><path d="M9 13h6M9 17h4"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1A1.7 1.7 0 008 19.4a1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H2a2 2 0 010-4h.1A1.7 1.7 0 003.6 8a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H8a1.7 1.7 0 001-1.5V2a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V8a1.7 1.7 0 001.5 1H22a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  chevronDown: <path d="M6 9l6 6 6-6"/>,
  chevronRight:<path d="M9 6l6 6-6 6"/>,
  plus:        <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon:        <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>,
  panel:       <><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M9 4v16"/></>,
  calendar:    <><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  info:        <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></>,
  check:       <path d="M5 12l5 5L20 7"/>,
  alert:       <><path d="M12 9v4M12 17v.01"/><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></>,
  arrowDown:   <path d="M12 5v14M5 12l7 7 7-7"/>,
  refresh:     <><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
  sparkle:     <path d="M12 3l1.8 4.9L19 9.5l-4.9 1.8L12 16l-1.8-4.7L5 9.5l4.9-1.6L12 3z"/>,
  x:           <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>,
  database:    <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></>,
  globe:       <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18"/></>,
  minus:       <path d="M5 12h14"/>,
  pencil:      <><path d="M3 21l4-1 12-12-3-3L4 17l-1 4z"/></>,
  trash:       <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M10 11v6M14 11v6"/></>,
}

export function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
