// 휴대폰 홈 화면에 추가했을 때 쓰이는 정보입니다. (웹 앱 매니페스트)
//
// - 이름·설명은 content/site.json 의 값을 그대로 씁니다.
// - 아이콘은 기존 LINKRIGHTS 로고로 만든 이미지(public/icons)이며 모양·색을 바꾸지 않았습니다.
// - 오프라인 저장(서비스 워커)은 넣지 않았습니다. 홈 화면 바로가기로 열면 주소창 없이 앱처럼 보이는 정도입니다.

import type { MetadataRoute } from 'next';
import { getSite } from '@/lib/content';
import { DEFAULT_LOCALE } from '@/lib/i18n';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const site = getSite();
  return {
    name: `${site.siteName} ${site.siteNameKo}`,
    short_name: site.siteName,
    description: site.description.ko,
    lang: DEFAULT_LOCALE,
    start_url: `/${DEFAULT_LOCALE}`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0b1730',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
