// content 폴더의 JSON 파일들을 읽어오는 곳입니다.
// 콘텐츠를 추가하려면 content/rights 폴더에 JSON 파일을 하나 더 넣기만 하면 됩니다.
// (이 파일을 고칠 필요는 없습니다.)

import fs from 'node:fs';
import path from 'node:path';
import type {
  AboutFile,
  Category,
  EmergencyConfig,
  FaqFile,
  Locale,
  Organization,
  ProgramsFile,
  ResolvedArticle,
  RightsArticle,
  SiteConfig,
} from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

/** 마지막 검토일이 이 일수보다 오래되면 "검토 필요"로 표시하고 AI 근거에서 제외합니다. */
export const STALE_AFTER_DAYS = 365;

function readJson<T>(...segments: string[]): T {
  const filePath = path.join(CONTENT_DIR, ...segments);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function cache<T>(fn: () => T): () => T {
  let value: T | undefined;
  return () => {
    if (value === undefined) value = fn();
    return value;
  };
}

export const getSite = cache((): SiteConfig => readJson<SiteConfig>('site.json'));

export const getCategories = cache((): Category[] => readJson<Category[]>('categories.json'));

export function getRightsCategories(): Category[] {
  return getCategories().filter((c) => c.kind === 'rights');
}

export function getCategory(id: string): Category | undefined {
  return getCategories().find((c) => c.id === id);
}

const readAllOrganizations = cache((): Organization[] => readJson<Organization[]>('organizations.json'));

/** 화면과 AI에 사용할 수 있는, 공개 상태의 기관만 돌려줍니다. */
export function getOrganizations(): Organization[] {
  return readAllOrganizations().filter((o) => o.status === 'published');
}

export function getOrganizationMap(): Map<string, Organization> {
  return new Map(getOrganizations().map((o) => [o.id, o]));
}

/** 등록되지 않은 기관 id 는 조용히 버립니다. AI가 기관을 지어내지 못하게 하는 안전장치입니다. */
export function resolveOrganizations(ids: string[]): Organization[] {
  const map = getOrganizationMap();
  const seen = new Set<string>();
  const result: Organization[] = [];
  for (const id of ids) {
    const org = map.get(id);
    if (org && !seen.has(id)) {
      seen.add(id);
      result.push(org);
    }
  }
  return result;
}

const readAllArticles = cache((): RightsArticle[] => {
  const dir = path.join(CONTENT_DIR, 'rights');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const raw = fs.readFileSync(path.join(dir, name), 'utf-8');
      return JSON.parse(raw) as RightsArticle;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
});

export function getArticles(): RightsArticle[] {
  return readAllArticles().filter((a) => a.status === 'published');
}

export function getArticle(id: string): RightsArticle | undefined {
  return getArticles().find((a) => a.id === id);
}

export function getArticlesByCategory(categoryId: string): RightsArticle[] {
  return getArticles().filter((a) => a.category === categoryId);
}

export function getFeaturedArticles(limit = 6): RightsArticle[] {
  const articles = getArticles();
  const featured = articles.filter((a) => a.featured);
  const rest = articles.filter((a) => !a.featured);
  return [...featured, ...rest].slice(0, limit);
}

/** 요청한 언어의 본문을 꺼내고, 없으면 한국어를 대신 씁니다. */
export function resolveArticle(article: RightsArticle, locale: Locale): ResolvedArticle {
  const body = article.i18n[locale];
  if (body) return { article, body, fallback: false };
  return { article, body: article.i18n.ko, fallback: locale !== 'ko' };
}

/** 마지막 검토일이 오래되었는지 확인합니다. */
export function isStale(reviewedAt: string, now = new Date()): boolean {
  if (!reviewedAt) return true;
  const date = new Date(reviewedAt);
  if (Number.isNaN(date.getTime())) return true;
  const days = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return days > STALE_AFTER_DAYS;
}

/** AI가 근거로 쓸 수 있는 글: 공개 상태이고 검토일이 오래되지 않은 것만. */
export function getGroundingArticles(): RightsArticle[] {
  return getArticles().filter((a) => !isStale(a.reviewed_at));
}

export const getEmergencyConfig = cache((): EmergencyConfig => readJson<EmergencyConfig>('emergency.json'));

export const getPrograms = cache((): ProgramsFile => readJson<ProgramsFile>('programs.json'));

export const getFaq = cache((): FaqFile => readJson<FaqFile>('faq.json'));

export const getAbout = cache((): AboutFile => readJson<AboutFile>('about.json'));

/** 권리정보 상세 페이지 주소 */
export function articleHref(locale: Locale, article: RightsArticle): string {
  return `/${locale}/rights/${article.category}/${article.id}`;
}
