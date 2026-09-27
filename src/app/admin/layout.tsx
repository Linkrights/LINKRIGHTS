// 운영팀 관리자 페이지의 틀입니다. (사이트 메뉴·푸터 없이 관리 화면만 보여줍니다)
// 검색엔진에 올리지 않고, 로그인한 사람만 내용을 볼 수 있습니다.

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';

export const metadata: Metadata = {
  title: 'LINKRIGHTS 관리자',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-surface-soft">{children}</body>
    </html>
  );
}
