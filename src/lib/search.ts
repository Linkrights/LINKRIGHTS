// 사용자의 질문과 가장 관련이 높은 권리정보를 찾아주는 간단한 검색기입니다.
// 무거운 검색 엔진이나 벡터 DB 없이, 키워드가 얼마나 겹치는지로 점수를 냅니다.
// 이렇게 하면 비용이 들지 않고, 결과가 왜 나왔는지 설명하기도 쉽습니다.
//
// 중요: 점수가 있다는 것과 관련 자료라는 것은 다릅니다.
// AI의 근거 자료로는 "등록된 키워드가 질문에 실제로 들어 있는 글"(keywordHits 가 있는 글)만 씁니다. (route.ts 참고)

import { getGroundingArticles, resolveArticle } from './content';
import { LOCALES, type Locale, type RightsArticle } from './types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[.,!?;:()[\]{}"'`~/\\|<>@#$%^&*_+=-]/g, ' ')
    .trim();
}

/**
 * 한국어 조사·어미 규칙입니다. [끝부분, 바꿀 글자] 이며 긴 것부터 확인합니다.
 *  - "이라서 / 이라는 / 이라고" 는 모두 "이라" 로 맞춥니다.
 *    ("외국인이라는" 과 "외국인이라서" 는 같은 말로 보지만, "외국인도" 와는 다른 말로 봅니다)
 *  - "하고 / 해요 / 했" 같은 '하다' 활용은 "하" 로 맞춥니다. ("연장하고" → "연장하")
 *  - 조사("를", "에서" 등)는 떼어냅니다. ("비자를" → "비자")
 */
const ENDING_RULES: [string, string][] = [
  ['했어요', '하'],
  ['했는데', '하'],
  ['하는데', '하'],
  ['이라서', '이라'],
  ['이라는', '이라'],
  ['이라고', '이라'],
  ['에서는', ''],
  ['에게서', ''],
  ['으로는', ''],
  ['하고', '하'],
  ['해서', '하'],
  ['해요', '하'],
  ['하는', '하'],
  ['하게', '하'],
  ['했다', '하'],
  ['한다', '하'],
  ['라서', '이라'],
  ['라는', '이라'],
  ['라고', '이라'],
  ['에서', ''],
  ['에게', ''],
  ['한테', ''],
  ['으로', ''],
  ['이랑', ''],
  ['까지', ''],
  ['부터', ''],
  ['처럼', ''],
  ['보다', ''],
  ['는데', ''],
  ['했', '하'],
  ['해', '하'],
  ['은', ''],
  ['는', ''],
  ['이', ''],
  ['가', ''],
  ['을', ''],
  ['를', ''],
  ['에', ''],
  ['의', ''],
  ['도', ''],
  ['만', ''],
  ['과', ''],
  ['와', ''],
  ['로', ''],
  ['랑', ''],
];

/** 조사·어미를 한 번 정리합니다. 남는 글자가 minLength 보다 짧아지면 그대로 둡니다. */
function stem(token: string, minLength = 2): string {
  for (const [ending, replacement] of ENDING_RULES) {
    if (token.endsWith(ending) && token.length - ending.length >= minLength) {
      return token.slice(0, token.length - ending.length) + replacement;
    }
  }
  return token;
}

/** 어느 글에나 흔하게 나오는 말입니다. 제목·요약 점수 계산에서 뺍니다. */
const COMMON_WORDS = new Set([
  '있어요',
  '없어요',
  '싶어요',
  '같아요',
  '해요',
  '했어요',
  '싶은데',
  '있는데',
  '없는데',
  '어떻게',
  '해야',
  '하나요',
  '되나요',
  '있나요',
  '궁금',
  '계속',
  '자꾸',
  '너무',
  '정말',
  '그냥',
  '지금',
  '요즘',
  '많이',
  '때문',
  '때문에',
  '이유',
  '학교',
  '한국',
  '친구',
  '친구들',
  '선생님',
  '사람',
  '말',
  '나',
  '저',
  '제',
  '내',
  '우리',
]);

function isCommon(token: string): boolean {
  return COMMON_WORDS.has(token) || COMMON_WORDS.has(stem(token)) || COMMON_WORDS.has(stem(token, 1));
}

/** 질문의 단어 하나가 키워드 조각과 같은 말인지 확인합니다. (조사·어미 차이는 같은 말로 봅니다) */
function sameWord(token: string, part: string): boolean {
  if (token === part) return true;
  // "돈을" = "돈" 처럼 한 글자 낱말은 조사만 뗀 모양이 같을 때만 같은 말로 봅니다.
  if (part.length === 1) return stem(token, 1) === part;
  const partStem = stem(part);
  const tokenStem = stem(token);
  // "무시해요" = "무시" 처럼 명사 + '하다' 는 같은 말로 봅니다.
  return tokenStem === partStem || tokenStem === `${partStem}하`;
}

/** 등록된 키워드가 질문에 들어 있는지 확인합니다. */
function keywordMatches(keyword: string, q: string, tokens: string[]): boolean {
  const term = normalize(keyword);
  if (term.length < 2) return false;
  // 1) 키워드가 글자 그대로 들어 있는 경우 (띄어쓰기가 없는 중국어 등도 이 방법으로 찾습니다)
  if (q.includes(term)) return true;
  // 2) 키워드의 모든 낱말이 조사·어미만 다르게 들어 있는 경우 ("비자 연장" ↔ "비자를 연장하고")
  const parts = term.split(' ').filter(Boolean);
  if (parts.length === 1 && stem(parts[0]).length < 2) return false;
  return parts.every((part) => tokens.some((token) => sameWord(token, part)));
}

function articleText(article: RightsArticle): { title: string; summary: string } {
  const titles: string[] = [];
  const summaries: string[] = [];
  for (const locale of LOCALES) {
    const body = article.i18n[locale];
    if (!body) continue;
    titles.push(body.title);
    summaries.push(body.summary, ...body.situations);
  }
  return { title: normalize(titles.join(' ')), summary: normalize(summaries.join(' ')) };
}

export interface ScoredArticle {
  article: RightsArticle;
  score: number;
  /**
   * 질문 안에 실제로 들어 있던 등록 키워드.
   * 비어 있으면 일상 단어만 겹친 결과이므로 AI의 근거 자료로 쓰지 않습니다.
   */
  keywordHits: string[];
}

/**
 * 질문과 관련이 높은 권리정보를 점수 순으로 돌려줍니다.
 * limit 개수만큼만 돌려줍니다. 근거 자료로 쓸지는 keywordHits 로 따로 판단합니다.
 */
export function findRelevantArticles(query: string, limit = 4): ScoredArticle[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const meaningfulTokens = tokens.filter((token) => token.length > 1 && !isCommon(token));

  const scored = getGroundingArticles().map((article) => {
    const { title, summary } = articleText(article);
    const keywordHits = article.keywords.filter((keyword) => keywordMatches(keyword, q, tokens));
    let score = 0;

    // 1) 등록된 키워드가 질문 안에 들어 있는가 (가장 강한 신호)
    score += keywordHits.length * 3;
    // 2) 제목의 (흔하지 않은) 낱말이 질문에 들어 있는가
    const titleWords = title.split(' ').filter((word) => word.length > 1 && !isCommon(word));
    score += titleWords.filter((word) => meaningfulTokens.some((token) => sameWord(token, word))).length;
    // 3) 질문의 (흔하지 않은) 낱말이 요약/상황 설명 안에 들어 있는가
    score += meaningfulTokens.filter((token) => summary.includes(stem(token))).length * 0.5;
    // 4) 카테고리 이름이 직접 언급되었는가
    if (q.includes(normalize(article.category))) score += 1;

    return { article, score, keywordHits };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    .slice(0, limit);
}

/** 관련 글을 하나도 못 찾았을 때 보여줄 기본 목록 */
export function fallbackArticles(locale: Locale, limit = 4) {
  return getGroundingArticles()
    .filter((a) => a.featured)
    .slice(0, limit)
    .map((article) => {
      const { body } = resolveArticle(article, locale);
      return { id: article.id, title: body.title, href: `/${locale}/rights/${article.category}/${article.id}` };
    });
}
