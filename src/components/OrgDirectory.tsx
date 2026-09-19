'use client';

// 도움받을 곳 목록입니다. 세 가지 방법으로 좁혀 볼 수 있고, 함께 쓸 수 있습니다.
//   1) 키워드 검색 — "임금", "알바", "학교", "비자", "병원", "상담", "외국인등록", "체류", "차별" 처럼 하고 싶은 말로 찾기
//   2) 분야 — 긴급 / 청소년기관 / 이주민 지원 / 공공기관 / 법률 상담
//   3) 내 지역 — 그 지역 기관과 전국 어디서나 이용할 수 있는 기관
//
// 검색 대상(기관 이름만 찾지 않습니다):
//   기관 이름 · 분야 이름 · 설명(이럴 때 도움을 받을 수 있어요) · 지역과 주소 · 지원 언어 · 전화번호
//   · 그 기관과 연결된 등록 권리정보의 제목과 키워드 (organizations/page.tsx 에서 미리 만들어 넘겨줍니다)
// 모두 등록된 자료(content/organizations.json, content/rights)에서만 가져오며 새 정보를 만들지 않습니다.
//
// 고른 조건은 주소(?region=서울&category=youth&q=임금)에만 남기고 브라우저 저장소나 서버에는 저장하지 않습니다.
// 기관 카드는 서버에서 그려 넘겨받습니다. 자바스크립트가 없으면 모든 기관이 그대로 보입니다.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Section } from './Section';
import { servesRegion } from '@/lib/regions';
import { expandWithGroups, textMatchesQuery, type TermGroup } from '@/lib/searchText';

/** 검색어 최대 길이 (검색어가 주소에 남으므로 짧게 제한합니다) */
export const MAX_ORG_SEARCH_LENGTH = 60;

export interface DirectoryItem {
  id: string;
  nationwide: boolean;
  regions: string[];
  /** 검색에 쓰는 글(기관 이름·분야·설명·지역·언어·전화·관련 권리정보). 서버에서 미리 만들어 넘깁니다. */
  search: string;
  /** 서버에서 그린 카드 (li 요소) */
  card: ReactNode;
}

export interface DirectoryGroup {
  key: string;
  title: string;
  items: DirectoryItem[];
}

export function OrgDirectory({
  groups,
  regions,
  synonyms = [],
  suggestions = [],
  labels,
}: {
  groups: DirectoryGroup[];
  regions: { key: string; label: string }[];
  /** 검색용 유사 표현 묶음 (content/search-synonyms.json). "알바" 로 적어도 "아르바이트" 를 함께 찾습니다. */
  synonyms?: TermGroup[];
  /** 검색창 자동완성 목록 (등록된 분야 이름·권리정보 키워드에서만) */
  suggestions?: string[];
  labels: {
    title: string;
    hint: string;
    all: string;
    countAll: string;
    countRegion: string;
    noRegional: string;
    groupsLabel: string;
    searchLabel: string;
    searchHint: string;
    searchPlaceholder: string;
    searchButton: string;
    searchClear: string;
    searchCount: string;
    emptyTitle: string;
    emptyBody: string;
    examplesLabel: string;
    examples: string[];
  };
}) {
  const [region, setRegion] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  /** 입력창에 적고 있는 글자 */
  const [draft, setDraft] = useState('');
  /** 실제로 찾고 있는 낱말 (검색 버튼이나 엔터로 확정) */
  const [query, setQuery] = useState('');
  const listId = 'org-search-suggestions';

  // 주소에 조건이 있으면(?region=서울&category=youth&q=임금) 그대로 시작합니다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('region');
    if (value && regions.some((item) => item.key === value)) setRegion(value);
    const group = params.get('category');
    if (group && groups.some((item) => item.key === group)) setCategory(group);
    const q = (params.get('q') ?? '').slice(0, MAX_ORG_SEARCH_LENGTH);
    if (q) {
      setDraft(q);
      setQuery(q);
    }
  }, [regions, groups]);

  /** 고른 조건을 주소에만 적어 둡니다. (새로고침하거나 링크를 나눠도 같은 화면이 보입니다) */
  function writeUrl(next: { region?: string | null; category?: string | null; q?: string }) {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | null | undefined) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    if ('region' in next) set('region', next.region);
    if ('category' in next) set('category', next.category);
    if ('q' in next) set('q', next.q);
    window.history.replaceState(null, '', url);
  }

  function chooseRegion(key: string | null) {
    setRegion(key);
    writeUrl({ region: key });
  }

  function chooseCategory(key: string | null) {
    setCategory(key);
    writeUrl({ category: key });
  }

  function runSearch(value: string) {
    const text = value.trim().slice(0, MAX_ORG_SEARCH_LENGTH);
    setQuery(text);
    writeUrl({ q: text });
  }

  function clearSearch() {
    setDraft('');
    runSearch('');
  }

  // 검색어와 같은 뜻의 다른 표현도 함께 찾습니다. ("알바" → "아르바이트")
  const queryTerms = useMemo(() => {
    const text = query.trim();
    if (!text) return [];
    return [text, ...expandWithGroups(text, synonyms)];
  }, [query, synonyms]);

  const matchesQuery = (item: DirectoryItem) =>
    queryTerms.length === 0 || queryTerms.some((term) => textMatchesQuery(item.search, term));

  const visibleGroups = groups
    .filter((group) => !category || group.key === category)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => servesRegion(item, region) && matchesQuery(item)),
    }))
    .filter((group) => group.items.length > 0);

  const allItems = groups.flatMap((group) => group.items);
  const shown = visibleGroups.flatMap((group) => group.items);
  const localCount = region ? shown.filter((item) => item.regions.includes(region)).length : 0;
  const nationwideCount = shown.filter((item) => item.nationwide && !(region && item.regions.includes(region))).length;
  const regionLabel = regions.find((item) => item.key === region)?.label ?? '';
  const filtered = Boolean(query) || Boolean(category);

  // 분야 버튼에 보여줄 숫자는 지금 고른 지역·검색어 기준으로 셉니다. (0곳인 분야도 눌러 볼 수 있게 그대로 둡니다)
  const countOf = (group: DirectoryGroup) =>
    group.items.filter((item) => servesRegion(item, region) && matchesQuery(item)).length;

  const chip = (active: boolean) =>
    `lr-press rounded-full border px-3.5 py-1.5 text-[15px] font-semibold transition-colors ${
      active
        ? 'border-navy-900 bg-navy-900 text-white'
        : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
    }`;

  return (
    <>
      <div className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container space-y-6 py-6">
          {/* 1) 키워드로 찾기 */}
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(draft);
            }}
          >
            <label htmlFor="org-search" className="block text-lg font-extrabold text-ink-900">
              {labels.searchLabel}
            </label>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-500">{labels.searchHint}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <span className="relative flex flex-1 items-center">
                <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 text-ink-500" />
                <input
                  id="org-search"
                  type="search"
                  value={draft}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft(value);
                    // 검색창의 x 를 눌러 비우면 바로 전체 목록으로 돌아갑니다.
                    if (value === '') runSearch('');
                  }}
                  maxLength={MAX_ORG_SEARCH_LENGTH}
                  placeholder={labels.searchPlaceholder}
                  autoComplete="off"
                  list={suggestions.length > 0 ? listId : undefined}
                  enterKeyHint="search"
                  className="lr-input pl-10"
                />
                {suggestions.length > 0 && (
                  <datalist id={listId}>
                    {suggestions.map((term) => (
                      <option key={term} value={term} />
                    ))}
                  </datalist>
                )}
              </span>
              <button type="submit" className="lr-btn lr-btn-primary lr-press shrink-0">
                {labels.searchButton}
              </button>
            </div>

            {/* 이렇게 찾아보세요 (등록된 분야·권리정보에서 고른 낱말) */}
            {labels.examples.length > 0 && !query && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-ink-500">{labels.examplesLabel}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {labels.examples.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(term);
                          runSearch(term);
                        }}
                        className="rounded-full border border-[var(--color-line)] bg-surface-soft px-3.5 py-1.5 text-[15px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          {/* 2) 분야로 좁히기 (검색과 함께 쓸 수 있습니다) */}
          <div className="border-t border-[var(--color-line)] pt-5">
            <h2 className="text-[15px] font-bold text-ink-900">{labels.groupsLabel}</h2>
            <div role="group" aria-label={labels.groupsLabel} className="mt-3 flex flex-wrap gap-2">
              <button type="button" aria-pressed={category === null} onClick={() => chooseCategory(null)} className={chip(category === null)}>
                {labels.all}
              </button>
              {groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  aria-pressed={category === group.key}
                  onClick={() => chooseCategory(category === group.key ? null : group.key)}
                  className={chip(category === group.key)}
                >
                  {group.title}{' '}
                  <span className={category === group.key ? 'text-white/70' : 'text-ink-500'}>{countOf(group)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3) 내 지역 선택하기 */}
          <div className="border-t border-[var(--color-line)] pt-5">
            <h2 className="text-[15px] font-bold text-ink-900">{labels.title}</h2>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-500">{labels.hint}</p>
            <div role="group" aria-label={labels.title} className="mt-3 flex flex-wrap gap-2">
              <button type="button" aria-pressed={region === null} onClick={() => chooseRegion(null)} className={chip(region === null)}>
                {labels.all}
              </button>
              {regions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={region === item.key}
                  onClick={() => chooseRegion(item.key)}
                  className={chip(region === item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 지금 몇 곳이 보이는지 */}
          <p aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-ink-900">
            <span>
              {filtered
                ? labels.searchCount.replace('{n}', String(shown.length))
                : region
                  ? labels.countRegion
                      .replace('{region}', regionLabel)
                      .replace('{local}', String(localCount))
                      .replace('{nationwide}', String(nationwideCount))
                  : labels.countAll.replace('{n}', String(allItems.length))}
            </span>
            {filtered && (
              <button type="button" onClick={clearSearch} className="lr-link text-[15px] font-semibold">
                {labels.searchClear}
              </button>
            )}
          </p>

          {region && localCount === 0 && shown.length > 0 && (
            <p className="max-w-3xl rounded-[var(--radius-control)] bg-surface-soft px-4 py-3 text-[15px] leading-relaxed text-ink-700">
              {labels.noRegional.replace('{region}', regionLabel)}
            </p>
          )}
        </div>
      </div>

      {/* 결과가 없을 때: "없음"으로 끝내지 않고 다음에 할 수 있는 일을 알려줍니다. */}
      {shown.length === 0 && (
        <div className="lr-container py-12">
          <div className="lr-card max-w-3xl p-6 sm:p-7">
            <h2 className="text-lg font-extrabold text-ink-900">{labels.emptyTitle}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{labels.emptyBody}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  chooseCategory(null);
                  chooseRegion(null);
                }}
                className="lr-btn lr-btn-primary lr-btn-sm lr-press"
              >
                {labels.searchClear}
              </button>
              {labels.examples.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setDraft(term);
                    runSearch(term);
                  }}
                  className="lr-btn lr-btn-ghost lr-btn-sm lr-press"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {visibleGroups.map((group) => (
        <Section key={group.key} id={group.key} title={group.title}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <DirectoryCard key={item.id}>{item.card}</DirectoryCard>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

function DirectoryCard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
