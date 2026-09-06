// 사이트에서 사용하는 데이터의 모양(타입)을 정의한 파일입니다.
// 콘텐츠를 수정할 때는 이 파일을 고칠 필요가 없습니다.

export const LOCALES = ['ko', 'en', 'zh', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ko';

/** 언어별 문자열 묶음. ko 는 반드시 있어야 하고 나머지는 없어도 됩니다. */
export type LocalizedText = { ko: string } & Partial<Record<Locale, string>>;
export type OptionalLocalizedText = Partial<Record<Locale, string>>;

export type ContentStatus = 'published' | 'draft';

export interface Category {
  id: string;
  kind: 'rights' | 'directory';
  icon: string;
  tone: string;
  name: LocalizedText;
  tagline: LocalizedText;
}

export interface Organization {
  id: string;
  category: 'emergency' | 'public' | 'youth' | 'migrant' | 'legal';
  emergency: boolean;
  name: LocalizedText;
  description: LocalizedText;
  phone: string;
  website: string;
  address?: OptionalLocalizedText;
  hours?: OptionalLocalizedText;
  languages: string[];
  region: string;
  status: ContentStatus;
  owner: string;
  reviewed_at: string;
  source_url: string;
}

export interface RightsBlock {
  title: string;
  body: string;
}

export interface RightsBody {
  title: string;
  summary: string;
  situations: string[];
  rights: RightsBlock[];
  actions: RightsBlock[];
  note?: string;
}

export interface RightsSource {
  title: string;
  url: string;
  publisher?: string;
}

export interface RightsArticle {
  id: string;
  category: string;
  status: ContentStatus;
  featured?: boolean;
  owner: string;
  reviewed_at: string;
  keywords: string[];
  organizations: string[];
  related: string[];
  sources: RightsSource[];
  i18n: { ko: RightsBody } & Partial<Record<Locale, RightsBody>>;
}

/** 화면에 그릴 때 쓰는, 언어가 이미 정해진 형태 */
export interface ResolvedArticle {
  article: RightsArticle;
  body: RightsBody;
  /** 요청한 언어의 번역이 없어서 한국어를 대신 보여주는 경우 true */
  fallback: boolean;
}

export interface EmergencyConfig {
  owner: string;
  reviewed_at: string;
  organizations: string[];
  keywords: Record<string, string[]>;
  title: LocalizedText;
  message: LocalizedText;
  steps: { ko: string[] } & Partial<Record<Locale, string[]>>;
  note: LocalizedText;
}

export interface ProgramItem {
  id: string;
  image: string;
  status: ContentStatus;
  tag: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
}

export interface ProgramsFile {
  owner: string;
  reviewed_at: string;
  items: ProgramItem[];
  community_notice: LocalizedText;
}

export interface FaqItem {
  id: string;
  q: LocalizedText;
  a: LocalizedText;
}

export interface FaqFile {
  owner: string;
  reviewed_at: string;
  items: FaqItem[];
}

export interface SiteConfig {
  siteName: string;
  siteNameKo: string;
  contactEmail: string;
  operator: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  exampleQuestions: { ko: string[] } & Partial<Record<Locale, string[]>>;
}

export interface AboutBody {
  hero_title: string;
  hero_body: string;
  why_title: string;
  why_body: string;
  problems_title: string;
  problems: RightsBlock[];
  change_title: string;
  change_body: string;
  what_title: string;
  what_we_do: RightsBlock[];
  sdg_title: string;
  sdgs: { code: string; name: string; body: string }[];
  team_title: string;
  team_body: string;
  future_title: string;
  future_body: string;
}

export interface AboutFile {
  owner: string;
  reviewed_at: string;
  i18n: { ko: AboutBody } & Partial<Record<Locale, AboutBody>>;
}

/** AI가 돌려주는 구조화된 답변 (서버에서 검증한 뒤 화면으로 보냅니다) */
export interface AiAnswer {
  category: string;
  urgency: 'normal' | 'urgent';
  summary: string;
  rights: RightsBlock[];
  actions: RightsBlock[];
  organizations: string[];
  sources: string[];
  follow_up_question: string;
  limitations: string;
}

export interface AskApiSuccess {
  ok: true;
  mode: 'ai' | 'emergency';
  answer: AiAnswer | null;
  /** 화면에 그대로 그릴 수 있도록 서버가 채워 넣은 기관 정보 */
  organizations: Organization[];
  /** 근거로 사용한 권리정보 (제목, 링크, 검토일) */
  sources: { id: string; title: string; href: string; reviewed_at: string; sources: RightsSource[] }[];
  emergency?: {
    title: string;
    message: string;
    steps: string[];
    note: string;
  };
}

export interface AskApiError {
  ok: false;
  error: 'rate_limit' | 'daily_limit' | 'too_long' | 'empty' | 'server';
  /** 답변을 못 만들었을 때 대신 보여줄 권리정보 */
  fallback?: { id: string; title: string; href: string }[];
}

export type AskApiResponse = AskApiSuccess | AskApiError;
