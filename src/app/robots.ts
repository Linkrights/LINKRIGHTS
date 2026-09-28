// 검색엔진 로봇에게 주는 안내입니다.
import type { MetadataRoute } from 'next';

function base(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://linkrights.vercel.app';
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // AI 응답을 만드는 주소, 운영팀 관리자 화면, 이용자가 보낸 질문 글은 검색 결과에 나오지 않게 합니다.
        disallow: ['/api/', '/admin', '/*/qna/s/', '/*/community'],
      },
    ],
    sitemap: `${base()}/sitemap.xml`,
  };
}
