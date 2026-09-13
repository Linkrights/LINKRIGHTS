// 사용자의 질문과 가장 관련이 높은 권리정보를 찾아주는 간단한 검색기입니다.
// 무거운 검색 엔진이나 벡터 DB 없이, 키워드가 얼마나 겹치는지로 점수를 냅니다.
// 이렇게 하면 비용이 들지 않고, 결과가 왜 나왔는지 설명하기도 쉽습니다.

import { getGroundingArticles, resolveArticle } from './content';
import { LOCALES, type Locale, type RightsArticle } from './types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[.,!?;:()[\]{}"'`~/\\|<>@#$%^&*_+=-]/g, ' ')
    .trim();
}

/** 한국어처럼 띄어쓰기가 불규칙한 언어를 위해, 단어 목록과 통째 문장 양쪽으로 확인합니다. */
function countHits(haystack: string, needles: string[], weight: number): number {
  let score = 0;
  for (const needle of needles) {
    const term = normalize(needle);
    if (term.length < 2) continue;
    if (haystack.includes(term)) score += weight;
  }
  return score;
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
   * 비어 있으면 일상 단어만 겹친 "관련 낮음" 결과이므로, AI에게도 그렇게 알려줍니다.
   */
  keywordHits: string[];
}

/**
 * 질문과 관련이 높은 권리정보를 점수 순으로 돌려줍니다.
 * limit 개수만큼만 AI에게 전달해 비용을 아낍니다.
 */
export function findRelevantArticles(query: string, limit = 4): ScoredArticle[] {
  const q = normalize(query);
  if (!q) return [];

  const scored = getGroundingArticles().map((article) => {
    const { title, summary } = articleText(article);
    const keywordHits = article.keywords.filter((keyword) => {
      const term = normalize(keyword);
      return term.length >= 2 && q.includes(term);
    });
    let score = 0;

    // 1) 등록된 키워드가 질문 안에 들어 있는가 (가장 강한 신호)
    score += keywordHits.length * 3;
    // 2) 제목의 단어가 질문 안에 들어 있는가
    score += countHits(q, title.split(' '), 1);
    // 3) 질문의 단어가 요약/상황 설명 안에 들어 있는가
    score += countHits(summary, q.split(' ').filter((w) => w.length > 1), 0.5);
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
