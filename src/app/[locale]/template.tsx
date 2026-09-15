'use client';

// 페이지를 옮길 때 새 화면이 아주 짧게(0.18초) 서서히 나타나게 합니다. (globals.css 의 .lr-page-enter)
// - 처음 사이트에 들어올 때는 적용하지 않아 첫 화면(소개 영상, 글자)이 늦게 보이지 않습니다.
// - 같은 분야 안에서 이동할 때(예: 권리정보 목록 → 권리정보 상세)도 효과가 나도록 주소(pathname)가 바뀔 때마다 다시 그립니다.
// - 옆으로 미끄러지는 움직임 없이 투명도만 바꾸고, 끝나면 아무 스타일도 남기지 않습니다.
// - "동작 줄이기"를 켠 사용자에게는 globals.css 의 전체 규칙으로 효과가 사라집니다.

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

let hasMounted = false;

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // 이 템플릿이 사이트 첫 진입 이후에 새로 만들어졌다면(다른 분야로 이동) 처음부터 효과를 줍니다.
  const [afterFirstVisit] = useState(() => hasMounted);
  const firstPath = useRef(pathname);
  const moved = pathname !== firstPath.current;

  useEffect(() => {
    hasMounted = true;
  }, []);

  return (
    <div key={pathname} className={afterFirstVisit || moved ? 'lr-page-enter' : undefined}>
      {children}
    </div>
  );
}
