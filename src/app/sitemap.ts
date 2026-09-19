// 검색엔진에게 "이 사이트에는 이런 페이지들이 있어요"라고 알려주는 파일입니다.
// 권리정보를 새로 추가하면 자동으로 여기에 포함됩니다.

import type { MetadataRoute } from 'next';
import { getArticles, getChecklists, getQnaPosts, getRightsCategories } from '@/lib/content';
import { LOCALES } from '@/lib/i18n';

function base(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://linkrights.vercel.app';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const root = base();
  // AI 질문 페이지(ask)는 검색 결과에 나오지 않도록 설정되어 있어 여기에 넣지 않습니다.
  // 저장한 권리정보(saved)는 브라우저마다 내용이 달라 넣지 않습니다.
  const staticPaths = [
    '',
    'rights',
    'organizations',
    'emergency',
    'about',
    'programs',
    'get-involved',
    'faq',
    'qna',
    'privacy',
    'checklists',
  ];
  const categories = getRightsCategories();
  const articles = getArticles();
  const checklists = getChecklists();
  const qnaPosts = getQnaPosts();
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
    for (const checklist of checklists) {
      entries.push({
        url: `${root}/${locale}/checklists/${checklist.id}`,
        lastModified: new Date(checklist.reviewed_at),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    for (const post of qnaPosts) {
      entries.push({
        url: `${root}/${locale}/qna/${post.id}`,
        lastModified: new Date(post.answered_at || post.asked_at),
        changeFrequency: 'monthly',
        priority: 0.5,
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
