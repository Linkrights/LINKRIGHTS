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
  /** 쉬는 날 (예: 주말·공휴일, 연중무휴). 확인되지 않았으면 넣지 않습니다. */
  holidays?: OptionalLocalizedText;
  /** 점심시간 등 상담하지 않는 시간. 확인되지 않았으면 넣지 않습니다. */
  break_time?: OptionalLocalizedText;
  languages: string[];
  /** 대표 지역. "전국" 또는 content/regions.json 의 key (예: "서울") */
  region: string;
  /** 전국 어디서나 이용할 수 있으면 true. 적지 않으면 region 이 "전국"인지로 판단합니다. (src/lib/regions.ts) */
  nationwide?: boolean;
  /** 이용할 수 있는 지역 목록 (content/regions.json 의 key). 적지 않으면 region 값을 씁니다. */
  regions?: string[];
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

/** 자주 묻는 질문의 카테고리 (화면에 보이는 순서) */
export const FAQ_CATEGORIES = ['usage', 'ai', 'privacy', 'rights', 'programs', 'emergency'] as const;
export type FaqCategoryId = (typeof FAQ_CATEGORIES)[number];

export interface FaqItem {
  id: string;
  category: FaqCategoryId;
  q: LocalizedText;
  a: LocalizedText;
  /** 홈에도 보여줄 질문 (최대 4개) */
  featured?: boolean;
  /** 답 아래에 전화 버튼으로 보여줄 등록 기관 id (content/organizations.json) */
  organizations?: string[];
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
  /** 하단에 보여줄 SNS·블로그·카카오톡 채널 링크 (url 이 비어 있으면 표시하지 않습니다) */
  social?: { instagram?: SocialLink; blog?: SocialLink; youtube?: SocialLink; kakaoChannel?: SocialLink };
  /** 하단 '위치'에 보여줄 곳 (순서대로 표시) */
  locations?: SiteLocation[];
}

export interface SiteLocation {
  name: LocalizedText;
  address: LocalizedText;
}

export interface SocialLink {
  url: string;
  label: string;
}

/** 검색용 유사 표현 묶음 (content/search-synonyms.json). 검색에만 쓰며 AI의 근거가 아닙니다. */
export interface SynonymGroup {
  id: string;
  terms: string[];
}

/** 체크리스트 한 항목. article(등록 권리정보) 또는 link(사이트 안의 도움 페이지)로 더 알아볼 곳을 연결합니다. */
export interface ChecklistItem {
  id: string;
  text: LocalizedText;
  article?: string;
  link?: 'organizations' | 'emergency';
}

export interface ChecklistBody {
  title: string;
  summary: string;
  note?: string;
}

/** 체크리스트 (content/checklists/*.json). 체크 상태는 이용자의 브라우저에만 저장합니다. */
export interface Checklist {
  id: string;
  status: ContentStatus;
  owner: string;
  reviewed_at: string;
  /** 관련 분야 id (categories.json) */
  category: string;
  /** 이 체크리스트의 바탕이 된 등록 권리정보 id */
  based_on: string[];
  /** 함께 보여줄 등록 기관 id */
  organizations: string[];
  i18n: { ko: ChecklistBody } & Partial<Record<Locale, ChecklistBody>>;
  items: ChecklistItem[];
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
  /** goal: 목표를 한 줄로 쉽게 풀어 쓴 말 (선택) */
  sdgs: { code: string; name: string; goal?: string; body: string }[];
  /** 두 목표가 LINKRIGHTS와 어떻게 이어지는지 한 문장 (선택) */
  sdg_link?: string;
  team_title: string;
  team_body: string;
  future_title: string;
  future_body: string;
  /** 각 SDG 목표와 LINKRIGHTS의 목적이 어떻게 이어지는지 (code 는 sdgs 의 code 와 같게. 없으면 표시하지 않습니다) */
  sdg_details?: SdgDetail[];
}

export interface SdgDetail {
  code: string;
  title: string;
  body?: string;
  points?: RightsBlock[];
}

export interface AboutFile {
  owner: string;
  reviewed_at: string;
  i18n: { ko: AboutBody } & Partial<Record<Locale, AboutBody>>;
}

/** 실제 참여자 후기 (content/testimonials.json). 인터뷰에서 실제로 한 말만, 공개 동의를 받은 경우에만 공개합니다. */
export interface Testimonial {
  id: string;
  status: ContentStatus;
  /** 공개 동의를 받았으면 true */
  consent: boolean;
  quote: LocalizedText;
  /** 예: 대학생 멘토, 참여 청소년 (이름·학교 등 개인을 알아볼 수 있는 정보는 넣지 않습니다) */
  role: LocalizedText;
}

export interface TestimonialsFile {
  owner: string;
  reviewed_at: string;
  items: Testimonial[];
}

/**
 * 상황 사전(content/search-intents.json)의 한 항목.
 * 짧은 질문·구어체 표현을 이미 등록된 권리정보와 연결할 때만 쓰며, 그 자체로는 근거 자료가 아닙니다.
 */
export interface SearchIntent {
  id: string;
  /** 사람이 읽는 상황 이름 (AI가 상황을 이해하도록 돕는 힌트) */
  label: string;
  /** 연결할 등록 권리정보. direct = 말만으로 상황이 분명함, possible = 확인되지 않은 조건이 맞을 때만 관련 */
  articles: { id: string; match: EvidenceTier }[];
  /** 사용자가 쓸 법한 표현 (언어별) */
  triggers: Partial<Record<Locale, string[]>>;
  /** 이 상황에서 아직 확인되지 않은 사실 (AI가 조건으로 말할 부분) */
  unknowns: string[];
  /** 정말 필요할 때만 쓸, 사용자가 쉽게 답할 수 있는 확인 질문 하나 (없으면 빈 문자열) */
  clarify: string;
}

export interface SearchIntentsFile {
  owner: string;
  reviewed_at: string;
  intents: SearchIntent[];
}

/** 근거 자료의 관련 단계. direct = 사용자의 말과 자료의 상황이 직접 맞음, possible = 확인되지 않은 조건이 맞을 때만 관련 */
export type EvidenceTier = 'direct' | 'possible';

/** 협력기관 (content/partners.json). 실제로 협력하는 기관만 등록합니다. */
export interface Partner {
  id: string;
  status: 'published' | 'draft';
  name: LocalizedText;
  /** 관계 표시 (예: 협력기관) */
  relation: LocalizedText;
  /** public 폴더 기준 로고 경로. 없으면 빈 문자열 */
  logo: string;
  /** 확인한 공식 주소. 모르면 빈 문자열 */
  url: string;
}

export interface PartnersFile {
  partners: Partner[];
}

/** AI 답변의 권리 한 항목. source 는 근거가 된 권리정보 id 입니다. (근거가 없으면 서버가 지웁니다) */
export interface AiRight extends RightsBlock {
  source: string;
}

/** AI가 돌려주는 구조화된 답변 (서버에서 검증한 뒤 화면으로 보냅니다) */
export interface AiAnswer {
  category: string;
  urgency: 'normal' | 'urgent';
  summary: string;
  /** 먼저 확인할 것: 다음 행동이 달라지는 사실 (최대 3개, 질문이 아닌 문장). 등록 자료·상황 힌트에서만 가져옵니다. */
  checks: string[];
  rights: AiRight[];
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
  /**
   * AI 답변(mode: 'ai')의 근거 자료 상태.
   * found = 사용자의 말과 직접 맞는 등록 권리정보를 근거로 답함
   * possible = 확인되지 않은 조건이 맞을 때만 관련되는 자료만 근거로 써서, 조건을 붙여 답함
   * none = 맞는 등록 자료가 없어 권리·기관 없이 답함
   */
  evidence?: 'found' | 'possible' | 'none';
  /** 답변에 쓰지 않았지만 상황에 따라 함께 볼 수 있는 등록 권리정보 (제목과 링크만) */
  related?: { id: string; title: string; href: string }[];
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

/** 추가 질문을 할 때 브라우저가 함께 보내는 이전 대화 한 번 (사용자 질문 + 그때 받은 AI 답변) */
export interface AskHistoryTurn {
  question: string;
  answer: {
    summary: string;
    rights: RightsBlock[];
    actions: RightsBlock[];
    follow_up_question: string;
    limitations: string;
  };
}

/** 브라우저가 /api/ask 로 보내는 내용 */
export interface AskApiRequest {
  question: string;
  locale: Locale;
  /** 추가 질문일 때만 보냅니다. 최초 질문에는 넣지 않습니다. */
  history?: AskHistoryTurn[];
}
