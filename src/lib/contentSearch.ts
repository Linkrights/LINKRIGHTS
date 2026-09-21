// 검색 화면에서 권리정보 말고 다른 콘텐츠(체크리스트·질문게시판)를 찾는 도구입니다.
// 등록된 자료(content/checklists, content/qna.json)에서만 찾고, 새 내용을 만들지 않습니다.
//
// 이렇게 찾습니다.
//  1) 검색어로 찾은 권리정보와 연결된 것: 체크리스트의 based_on, 질문게시판 글의 articles 에 그 권리정보가 있으면
//     (예: "알바" → 알바 관련 권리정보 → 그 권리정보로 만든 "알바 시작 전 확인할 것" 체크리스트)
//  2) 제목·요약·항목 글에 검색어(또는 같은 뜻의 다른 표현)가 들어 있는 것
// 검색어가 주소(?q=)로 넘어오는 검색 화면 전용이며, AI 답변의 근거로는 쓰지 않습니다.

import { getChecklists, getQnaPosts, getSearchSynonyms } from './content';
import { expandWithGroups, textMatchesQuery } from './searchText';
import type { Checklist, Locale, QnaPost } from './types';

function queryTerms(q: string): string[] {
  const text = q.trim();
  if (!text) return [];
  return [text, ...expandWithGroups(text, getSearchSynonyms())];
}

function matches(text: string, terms: string[]): boolean {
  return terms.some((term) => textMatchesQuery(text, term));
}

/** 검색어와 관련된 체크리스트 (찾은 권리정보에서 만든 것을 먼저) */
export function findChecklists(q: string, locale: Locale, articleIds: Set<string>, limit = 4): Checklist[] {
  const terms = queryTerms(q);
  if (terms.length === 0) return [];
  const scored = getChecklists()
    .map((checklist) => {
      const bodies = [checklist.i18n[locale], checklist.i18n.ko].filter(Boolean);
      const text = [
        ...bodies.flatMap((body) => [body!.title, body!.summary]),
        ...checklist.items.flatMap((item) => [item.text[locale] ?? '', item.text.ko]),
      ].join(' ');
      const linked = checklist.based_on.filter((id) => articleIds.has(id)).length;
      const textHit = matches(text, terms);
      return { checklist, score: (textHit ? 10 : 0) + linked };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.checklist);
}

/** 검색어와 관련된 질문게시판 글 (운영팀 답이 달린 질문만. 이용 안내 공지는 검색 결과로 보여주지 않습니다) */
export function findQnaPosts(q: string, locale: Locale, articleIds: Set<string>, limit = 4): QnaPost[] {
  const terms = queryTerms(q);
  if (terms.length === 0) return [];
  return getQnaPosts()
    .filter((post) => post.kind === 'question' && Boolean(post.answer))
    .map((post) => {
      const text = [post.title, post.question, post.answer]
        .flatMap((field) => (field ? [field[locale] ?? '', field.ko] : []))
        .join(' ');
      const linked = (post.articles ?? []).filter((id) => articleIds.has(id)).length;
      return { post, score: (matches(text, terms) ? 10 : 0) + linked };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.post);
}
