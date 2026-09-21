// 권리정보 검색창입니다. (홈, 권리정보 목록 페이지, 검색 결과 페이지에서 사용)
// 홈처럼 다른 상자 안에 넣을 때는 bare 로 테두리 없이 쓰고, 제목·안내 문구를 바꿀 수 있습니다.
// 자바스크립트 없이도 동작하는 일반 검색 폼이며, /[locale]/rights/search?q=낱말 로 이동합니다.
// AI 질문과의 차이: 검색은 등록된 정보를 낱말로 바로 찾고, AI 질문은 내 상황을 문장으로 설명하면 정리해 줍니다.

import Link from 'next/link';
import { Icon } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

/** 검색어 최대 길이 (검색어는 주소에 남으므로 짧은 낱말 검색만 받습니다) */
export const MAX_SEARCH_LENGTH = 100;

export function RightsSearchForm({
  locale,
  defaultValue = '',
  suggestions = [],
  bare = false,
  title,
  hint,
  showAskLink = true,
}: {
  locale: Locale;
  defaultValue?: string;
  /** 테두리·안쪽 여백 없이 (다른 상자 안에 넣을 때) */
  bare?: boolean;
  /** 제목과 안내 문구 (없으면 기본 문구) */
  title?: string;
  hint?: string;
  /** 아래의 "AI에게 상황 설명하기" 링크 (홈처럼 바로 옆에 AI 안내가 있으면 끕니다) */
  showAskLink?: boolean;
  /** 검색창 자동완성 목록. 등록된 권리정보의 키워드와 유사 표현에서만 가져옵니다. (search.ts 의 searchSuggestions) */
  suggestions?: string[];
}) {
  const t = getMessages(locale);
  const listId = 'rights-search-suggestions';

  return (
    <div className={bare ? '' : 'lr-card p-5 sm:p-6'}>
      <form action={`/${locale}/rights/search`} method="get" role="search">
        <label htmlFor="rights-search" className="block text-lg font-extrabold tracking-tight text-ink-900">
          {title ?? t.search.label}
        </label>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{hint ?? t.search.hint}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <span className="relative flex flex-1 items-center">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 text-ink-500" />
            <input
              id="rights-search"
              name="q"
              type="search"
              defaultValue={defaultValue}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder={t.search.placeholder}
              autoComplete="off"
              list={suggestions.length > 0 ? listId : undefined}
              enterKeyHint="search"
              className="lr-input pl-10"
            />
            {/* 자동완성: 등록된 권리정보의 키워드만 보여줍니다. 없는 낱말을 추천하지 않습니다. */}
            {suggestions.length > 0 && (
              <datalist id={listId}>
                {suggestions.map((term) => (
                  <option key={term} value={term} />
                ))}
              </datalist>
            )}
          </span>
          <button type="submit" className="lr-btn lr-btn-primary lr-press shrink-0">
            {t.search.button}
          </button>
        </div>
      </form>

      <div className="mt-4">
        <p className="text-sm font-semibold text-ink-500">{t.search.examplesLabel}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {t.search.examples.map((term) => (
            <li key={term}>
              <Link
                href={`/${locale}/rights/search?q=${encodeURIComponent(term)}`}
                className="inline-block rounded-full border border-[var(--color-line)] bg-surface-soft px-3.5 py-1.5 text-[15px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {term}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {showAskLink && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-line)] pt-4 text-[15px] text-ink-500">
          <span>{t.search.askNote}</span>{' '}
          <Link href={`/${locale}/ask`} className="lr-link inline-flex items-center gap-1 font-semibold">
            {t.search.askCta} <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      )}
    </div>
  );
}
