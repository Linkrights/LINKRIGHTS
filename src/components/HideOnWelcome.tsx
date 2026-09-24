'use client';

// 처음 언어를 고르는 화면(/언어/welcome)에서는 아래쪽 정보(Footer)를 보여주지 않습니다.
// 고르는 일 하나에만 집중할 수 있게 하기 위한 것이며, 다른 화면에서는 그대로 보입니다.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function HideOnWelcome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.endsWith('/welcome')) return null;
  return <>{children}</>;
}
