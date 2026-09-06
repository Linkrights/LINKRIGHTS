// 검색엔진에게 "이 사이트에는 이런 페이지들이 있어요"라고 알려주는 파일입니다.
// 권리정보를 새로 추가하면 자동으로 여기에 포함됩니다.

import type { MetadataRoute } from 'next';
import { getArticles, getRightsCategories } from '@/lib/content';
import { LOCALES } from '@/lib/i18n';

function base(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://linkrights.example.org';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const root = base();
  const staticPaths = ['', 'ask', 'rights', 'organizations', 'emergency', 'about', 'programs', 'faq', 'privacy'];
  const categories = getRightsCategories();
  const articles = getArticles();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of staticPaths) {
      entries.push({
        url: path ? `${root}/${locale}/${path}` : `${root}/${locale}`,
        changeFrequency: 'monthly',
        priority: path === '' ? 1 : 0.7,
      });
    }
    for (const category of categories) {
      entries.push({
        url: `${root}/${locale}/rights/${category.id}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    for (const article of articles) {
      entries.push({
        url: `${root}/${locale}/rights/${article.category}/${article.id}`,
        lastModified: new Date(article.reviewed_at),
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  }

  return entries;
}
