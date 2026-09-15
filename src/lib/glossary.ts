// "쉬운 말 풀이" 용어를 글 안에서 찾는 함수입니다. (content/glossary.json)
// 파일을 읽지 않는 순수 함수라 서버(권리정보 페이지)와 브라우저(AI 답변 화면) 양쪽에서 씁니다.
// 등록된 용어만 찾아 보여줄 뿐, 글이나 AI 답변의 내용을 바꾸지는 않습니다.

import type { Locale, LocalizedText } from './types';

export interface GlossaryTerm {
  id: string;
  status: 'published' | 'draft';
  /** 본문에 실제로 쓰인 표현 (언어별) */
  term: LocalizedText;
  /** 쉬운 말 풀이 (언어별) */
  easy: LocalizedText;
}

export interface GlossaryFile {
  owner: string;
  reviewed_at: string;
  terms: GlossaryTerm[];
}

export interface GlossaryMatch {
  id: string;
  term: string;
  easy: string;
}

/**
 * 글(texts)에 나오는 용어를 찾습니다.
 * textLocale 은 글이 실제로 쓰인 언어입니다. (번역이 없어 한국어 본문을 보여줄 때는 'ko')
 * 풀이는 화면 언어(locale)로 보여주고, 그 언어 풀이가 없으면 한국어 풀이를 씁니다.
 */
export function matchGlossary(
  terms: GlossaryTerm[],
  texts: string[],
  textLocale: Locale,
  locale: Locale,
): GlossaryMatch[] {
  const haystack = texts.join('\n').toLowerCase();
  const found: GlossaryMatch[] = [];
  for (const item of terms) {
    const term = item.term[textLocale];
    if (!term || !haystack.includes(term.toLowerCase())) continue;
    const easy = item.easy[locale] ?? item.easy.ko;
    if (easy) found.push({ id: item.id, term, easy });
  }
  return found;
}
