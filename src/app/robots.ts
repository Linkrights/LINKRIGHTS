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
        // AI 응답을 만드는 주소는 검색 결과에 나올 필요가 없습니다.
        disallow: '/api/',
      },
    ],
    sitemap: `${base()}/sitemap.xml`,
  };
}
