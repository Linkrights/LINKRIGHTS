// content 폴더의 JSON 파일들을 읽어오는 곳입니다.
// 콘텐츠를 추가하려면 content/rights 폴더에 JSON 파일을 하나 더 넣기만 하면 됩니다.
// (이 파일을 고칠 필요는 없습니다.)

import fs from 'node:fs';
import path from 'node:path';
import type {
  AboutFile,
  Category,
  Checklist,
  EmergencyConfig,
  FaqFile,
  Locale,
  Organization,
  Partner,
  PartnersFile,
  ProgramsFile,
  QnaFile,
  QnaPost,
  ResolvedArticle,
  RightsArticle,
  SearchIntent,
  SearchIntentsFile,
  SiteConfig,
  SynonymGroup,
  Testimonial,
  TestimonialsFile,
} from './types';
import type { GlossaryFile, GlossaryTerm } from './glossary';

const CONTENT_DIR = path.join(process.cwd(), 'content');

/** 체크리스트 (content/checklists/*.json 의 published 만, 파일 이름 순). 폴더가 없으면 빈 목록입니다. */
export function getChecklists(): Checklist[] {
  const dir = path.join(CONTENT_DIR, 'checklists');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson<Checklist>('checklists', name))
    .filter((checklist) => checklist.status === 'published');
}

export function getChecklist(id: string): Checklist | undefined {
  return getChecklists().find((checklist) => checklist.id === id);
}

/** 검색용 유사 표현 묶음 (content/search-synonyms.json). 검색에만 쓰며 근거가 아닙니다. 파일이 없으면 빈 목록입니다. */
export const getSearchSynonyms = cache((): SynonymGroup[] => {
  if (!fs.existsSync(path.join(CONTENT_DIR, 'search-synonyms.json'))) return [];
  return readJson<{ groups?: SynonymGroup[] }>('search-synonyms.json').groups ?? [];
});

/** 공개 동의(consent)를 받아 공개로 표시한 실제 참여자 후기만 돌려줍니다. 파일이 없으면 빈 목록입니다. */
export function getTestimonials(): Testimonial[] {
  if (!fs.existsSync(path.join(CONTENT_DIR, 'testimonials.json'))) return [];
  return (readJson<TestimonialsFile>('testimonials.json').items ?? []).filter(
    (item) => item.status === 'published' && item.consent === true && Boolean(item.quote?.ko?.trim()),
  );
}

/** 공개로 표시한 "쉬운 말 풀이" 용어 (content/glossary.json). 파일이 없으면 빈 목록입니다. */
export function getGlossary(): GlossaryTerm[] {
  if (!fs.existsSync(path.join(CONTENT_DIR, 'glossary.json'))) return [];
  return (readJson<GlossaryFile>('glossary.json').terms ?? []).filter((term) => term.status === 'published');
}

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

/** 짧은 질문·구어체를 등록 권리정보와 연결하는 상황 사전. 파일이 없으면 빈 목록입니다. (search.ts 참고) */
export const getSearchIntents = cache((): SearchIntent[] => {
  if (!fs.existsSync(path.join(CONTENT_DIR, 'search-intents.json'))) return [];
  return readJson<SearchIntentsFile>('search-intents.json').intents ?? [];
});

/** 화면에 보여줄 협력기관 (content/partners.json 의 published 만). 파일이 없으면 빈 목록입니다. */
export const getPartners = cache((): Partner[] => {
  if (!fs.existsSync(path.join(CONTENT_DIR, 'partners.json'))) return [];
  return (readJson<PartnersFile>('partners.json').partners ?? []).filter((partner) => partner.status === 'published');
});

/**
 * 질문 게시판(content/qna.json)의 공개된 글입니다.
 * 공지를 먼저, 그다음 질문을 최근 날짜 순으로 돌려줍니다. 파일이 없으면 빈 목록입니다.
 */
export const getQnaPosts = cache((): QnaPost[] => {
  if (!fs.existsSync(path.join(CONTENT_DIR, 'qna.json'))) return [];
  const posts = (readJson<QnaFile>('qna.json').posts ?? []).filter((post) => post.status === 'published');
  const notices = posts.filter((post) => post.kind === 'notice');
  const questions = posts
    .filter((post) => post.kind !== 'notice')
    .sort((a, b) => (a.asked_at < b.asked_at ? 1 : a.asked_at > b.asked_at ? -1 : a.id.localeCompare(b.id)));
  return [...notices, ...questions];
});

export function getQnaPost(id: string): QnaPost | undefined {
  return getQnaPosts().find((post) => post.id === id);
}

/** 권리정보 상세 페이지 주소 */
export function articleHref(locale: Locale, article: RightsArticle): string {
  return `/${locale}/rights/${article.category}/${article.id}`;
}
