// 사이트에서 쓰는 아이콘 모음입니다. 그림 파일 대신 코드로 그려서 빠르고 가볍습니다.
import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'briefcase'
  | 'book'
  | 'heart'
  | 'passport'
  | 'home'
  | 'shield'
  | 'lifebuoy'
  | 'arrow-right'
  | 'phone'
  | 'globe'
  | 'alert'
  | 'menu'
  | 'close'
  | 'external'
  | 'sparkles'
  | 'check'
  | 'search'
  | 'speaker'
  | 'pause'
  | 'stop'
  | 'star'
  | 'map-pin'
  | 'sun'
  | 'moon'
  | 'text-size'
  | 'monitor'
  | 'thumb-up'
  | 'thumb-down'
  | 'message';

const paths: Record<IconName, ReactNode> = {
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
      <path d="M8 3v18" />
    </>
  ),
  heart: <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.65-7 9-7 9z" />,
  passport: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9 17h6" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
    </>
  ),
  'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6" />,
  phone: (
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.5 3 19.5h18z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  sparkles: <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  pause: <path d="M8.5 5v14M15.5 5v14" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />,
  'map-pin': (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  'text-size': (
    <>
      <path d="M3 7V5.5h9V7M7.5 5.5V19M5.5 19h4" />
      <path d="M13 12v-1h8v1M17 11v8M15 19h4" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  'thumb-up': (
    <>
      <path d="M7 10.5 11 3a2.2 2.2 0 0 1 2.2 2.2V9h4.6a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 16.8 19H7z" />
      <rect x="3" y="10.5" width="4" height="8.5" rx="1" />
    </>
  ),
  'thumb-down': (
    <>
      <path d="M7 13.5 11 21a2.2 2.2 0 0 0 2.2-2.2V15h4.6a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16.8 5H7z" />
      <rect x="3" y="5" width="4" height="8.5" rx="1" />
    </>
  ),
  message: (
    <>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
      <path d="M8 9.5h8M8 13h5" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name] ?? paths.sparkles}
    </svg>
  );
}
