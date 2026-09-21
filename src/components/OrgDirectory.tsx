'use client';

// 도움받을 곳 목록입니다. 세 가지 방법으로 좁혀 볼 수 있고, 함께 쓸 수 있습니다.
//   1) 키워드 검색 — "임금", "알바", "학교", "비자", "병원", "상담", "외국인등록", "체류", "차별" 처럼 하고 싶은 말로 찾기
//      "부산에서 임금 문제 도움받고 싶어요"처럼 문장으로 적어도, 시·도 이름은 지역 선택으로 바꾸고
//      찾는 데 쓰이지 않는 말(도움받고, 싶어요, 문제 …)은 빼고 찾습니다. (src/lib/orgSearch.ts)
//   2) 지역 — 전체 지역 / 전국 기관만 / 17개 시·도
//   3) 분야 — 노동·임금 / 법률 / 체류·비자 … (기관 데이터의 topics, src/lib/topics.ts)
//
// 지역을 고르면 "그 지역 기관"을 먼저, 이어서 "전국 어디서나 이용할 수 있는 곳"을 보여줍니다.
// 그 지역으로 등록된 기관이 하나도 없으면, 기관을 만들어 채우지 않고 가족센터 찾기(FamilyNet)로 안내합니다.
// (FamilyNet 주소와 전화번호도 content/organizations.json 에 등록된 "우리 동네 가족센터"에서 가져옵니다)
//
// 검색 대상(기관 이름만 찾지 않습니다):
//   기관 이름 · 분야 이름 · 설명(이럴 때 도움을 받을 수 있어요) · 지역과 주소 · 지원 언어 · 전화번호
//   · 그 기관과 연결된 등록 권리정보의 제목과 키워드 (organizations/page.tsx 에서 미리 만들어 넘겨줍니다)
// 모두 등록된 자료(content/organizations.json, content/rights)에서만 가져오며 새 정보를 만들지 않습니다.
//
// 고른 조건은 주소(?region=서울&topic=labor&q=임금)에만 남기고 브라우저 저장소나 서버에는 저장하지 않습니다.
// 기관 카드는 서버에서 그려 넘겨받습니다. 자바스크립트가 없으면 모든 기관이 그대로 보입니다.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Section } from './Section';
import { parseOrgQuery } from '@/lib/orgSearch';
import { NATIONWIDE, servesRegion } from '@/lib/regions';
import { expandWithGroups, normalize, textMatchesQuery, type TermGroup } from '@/lib/searchText';

/** 검색어 최대 길이 (검색어가 주소에 남으므로 짧게 제한합니다) */
export const MAX_ORG_SEARCH_LENGTH = 60;

export interface DirectoryItem {
  id: string;
  nationwide: boolean;
  regions: string[];
  /** 이 기관이 도와주는 분야 (organizations.json 의 topics) */
  topics: string[];
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
  topics,
  family,
  synonyms = [],
  suggestions = [],
  labels,
}: {
  groups: DirectoryGroup[];
  regions: { key: string; label: string }[];
  /** 분야 선택 목록 (src/lib/topics.ts 순서, 화면 언어 이름) */
  topics: { key: string; label: string }[];
  /** 지역 기관이 없을 때 안내할 가족센터 찾기 (등록된 "우리 동네 가족센터"의 누리집·전화). 없으면 글만 보여줍니다. */
  family?: { website: string; phone: string };
  /** 검색용 유사 표현 묶음 (content/search-synonyms.json). "알바" 로 적어도 "아르바이트" 를 함께 찾습니다. */
  synonyms?: TermGroup[];
  /** 검색창 자동완성 목록 (등록된 분야 이름·권리정보 키워드에서만) */
  suggestions?: string[];
  labels: {
    filtersTitle: string;
    hint: string;
    regionLabel: string;
    topicLabel: string;
    allRegions: string;
    nationwideOnly: string;
    allTopics: string;
    countAll: string;
    countRegion: string;
    countNationwide: string;
    localTitle: string;
    nationwideTitle: string;
    localNoMatch: string;
    familyTitle: string;
    noRegional: string;
    familyButton: string;
    regionFromSearch: string;
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
    openInNew: string;
  };
}) {
  /** null = 전체 지역, "전국" = 전국 기관만, 그 밖에는 시·도 key */
  const [region, setRegion] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  /** 입력창에 적고 있는 글자 */
  const [draft, setDraft] = useState('');
  /** 실제로 찾고 있는 말 (검색 버튼이나 엔터로 확정) */
  const [query, setQuery] = useState('');
  /** 지역을 검색어에서 찾아 골랐는지 (안내 문구용) */
  const [regionFromQuery, setRegionFromQuery] = useState(false);
  const listId = 'org-search-suggestions';

  // 주소에 조건이 있으면(?region=서울&topic=labor&q=임금) 그대로 시작합니다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('region');
    const fromUrl = value && (value === NATIONWIDE || regions.some((item) => item.key === value)) ? value : null;
    if (fromUrl) setRegion(fromUrl);
    const topicValue = params.get('topic');
    if (topicValue && topics.some((item) => item.key === topicValue)) setTopic(topicValue);
    const q = (params.get('q') ?? '').slice(0, MAX_ORG_SEARCH_LENGTH);
    if (q) {
      setDraft(q);
      setQuery(q);
      // 지역을 따로 고르지 않은 주소라면, 검색어의 시·도 이름으로 지역을 고릅니다.
      const found = parseOrgQuery(q).region;
      if (!fromUrl && found) {
        setRegion(found);
        setRegionFromQuery(true);
      }
    }
  }, [regions, topics]);

  /** 고른 조건을 주소에만 적어 둡니다. (새로고침하거나 링크를 나눠도 같은 화면이 보입니다) */
  function writeUrl(next: { region?: string | null; topic?: string | null; q?: string }) {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | null | undefined) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    if ('region' in next) set('region', next.region);
    if ('topic' in next) set('topic', next.topic);
    if ('q' in next) set('q', next.q);
    // 예전 주소의 분야(category) 조건은 더 쓰지 않습니다.
    url.searchParams.delete('category');
    window.history.replaceState(null, '', url);
  }

  function chooseRegion(key: string | null) {
    setRegion(key);
    setRegionFromQuery(false);
    writeUrl({ region: key });
  }

  function chooseTopic(key: string | null) {
    setTopic(key);
    writeUrl({ topic: key });
  }

  function runSearch(value: string) {
    const text = value.trim().slice(0, MAX_ORG_SEARCH_LENGTH);
    setQuery(text);
    // "부산에서 임금 문제"처럼 시·도 이름이 있으면 그 지역을 고릅니다.
    const found = text ? parseOrgQuery(text).region : null;
    if (found) {
      setRegion(found);
      setRegionFromQuery(true);
      writeUrl({ q: text, region: found });
    } else {
      writeUrl({ q: text });
    }
  }

  function clearAll() {
    setDraft('');
    setQuery('');
    setRegion(null);
    setTopic(null);
    setRegionFromQuery(false);
    writeUrl({ q: '', region: null, topic: null });
  }

  // 시·도 이름과 찾는 데 쓰이지 않는 말을 뺀 검색어, 그리고 같은 뜻의 다른 표현 ("알바" → "아르바이트")
  const searchText = useMemo(() => parseOrgQuery(query).text, [query]);
  const queryTerms = useMemo(() => {
    if (!searchText) return [];
    return [searchText, ...expandWithGroups(searchText, synonyms)];
  }, [searchText, synonyms]);
  // 낱말이 모두 들어 있는 기관이 하나도 없으면, 낱말 하나라도 들어 있는 기관을 보여줍니다.
  const looseTerms = useMemo(
    () => normalize(searchText).split(' ').filter((token) => token.length >= 2),
    [searchText],
  );

  const allItems = groups.flatMap((group) => group.items);
  const inRegion = (item: DirectoryItem) =>
    region === NATIONWIDE ? item.nationwide : servesRegion(item, region);
  const inTopic = (item: DirectoryItem) => !topic || item.topics.includes(topic);
  const strictMatch = (item: DirectoryItem) =>
    queryTerms.length === 0 || queryTerms.some((term) => textMatchesQuery(item.search, term));
  const useLoose =
    queryTerms.length > 0 && looseTerms.length > 1 && !allItems.some((item) => inRegion(item) && inTopic(item) && strictMatch(item));
  const matchesQuery = (item: DirectoryItem) =>
    useLoose ? looseTerms.some((term) => textMatchesQuery(item.search, term)) : strictMatch(item);
  const visible = (item: DirectoryItem) => inRegion(item) && inTopic(item) && matchesQuery(item);

  const visibleGroups = groups
    .map((group) => ({ ...group, items: group.items.filter(visible) }))
    .filter((group) => group.items.length > 0);
  const shown = visibleGroups.flatMap((group) => group.items);

  // 시·도를 골랐을 때: 그 지역 기관 → 전국 기관 순서로 나눠 보여줍니다.
  const isLocal = Boolean(region) && region !== NATIONWIDE;
  const localItems = isLocal ? shown.filter((item) => item.regions.includes(region as string)) : [];
  const nationwideItems = isLocal ? shown.filter((item) => item.nationwide && !item.regions.includes(region as string)) : [];
  /** 이 지역으로 등록된 기관이 (검색·분야 조건과 상관없이) 하나라도 있는지 */
  const hasLocalData = isLocal && allItems.some((item) => item.regions.includes(region as string));
  const regionLabel = regions.find((item) => item.key === region)?.label ?? '';

  // 분야 선택 상자에 보여줄 숫자는 지금 고른 지역·검색어 기준으로 셉니다. (0곳인 분야도 고를 수 있게 둡니다)
  const topicCount = (key: string) =>
    allItems.filter((item) => inRegion(item) && item.topics.includes(key) && matchesQuery(item)).length;

  const filtered = Boolean(query) || Boolean(topic);
  const anyCondition = filtered || Boolean(region);
  const countText = isLocal
    ? labels.countRegion
        .replace('{region}', regionLabel)
        .replace('{local}', String(localItems.length))
        .replace('{nationwide}', String(nationwideItems.length))
    : region === NATIONWIDE
      ? labels.countNationwide.replace('{n}', String(shown.length))
      : filtered
        ? labels.searchCount.replace('{n}', String(shown.length))
        : labels.countAll.replace('{n}', String(allItems.length));

  const selectClass =
    'h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] py-0 pl-3.5 pr-9 text-[15px] font-semibold text-ink-900 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-100';

  const grid = (items: DirectoryItem[]) => (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <DirectoryCard key={item.id}>{item.card}</DirectoryCard>
      ))}
    </ul>
  );

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
                    // 검색창의 x 를 눌러 비우면 바로 검색어 없는 목록으로 돌아갑니다.
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

          {/* 2) 지역 · 3) 분야 (선택 상자 두 개. 휴대폰에서는 분야 이름이 잘리지 않게 위아래로 놓습니다) */}
          <div className="border-t border-[var(--color-line)] pt-5">
            <h2 className="text-[15px] font-bold text-ink-900">{labels.filtersTitle}</h2>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-500">{labels.hint}</p>
            <div className="mt-3 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="org-region" className="mb-1 block text-sm font-semibold text-ink-700">
                  {labels.regionLabel}
                </label>
                <span className="relative flex items-center">
                  <select
                    id="org-region"
                    value={region ?? ''}
                    onChange={(event) => chooseRegion(event.target.value || null)}
                    className={selectClass}
                  >
                    <option value="">{labels.allRegions}</option>
                    <option value={NATIONWIDE}>{labels.nationwideOnly}</option>
                    {regions.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3.5 text-xs text-ink-500" aria-hidden="true">
                    ▾
                  </span>
                </span>
              </div>
              <div className="min-w-0">
                <label htmlFor="org-topic" className="mb-1 block text-sm font-semibold text-ink-700">
                  {labels.topicLabel}
                </label>
                <span className="relative flex items-center">
                  <select
                    id="org-topic"
                    value={topic ?? ''}
                    onChange={(event) => chooseTopic(event.target.value || null)}
                    className={selectClass}
                  >
                    <option value="">{labels.allTopics}</option>
                    {topics.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label} ({topicCount(item.key)})
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3.5 text-xs text-ink-500" aria-hidden="true">
                    ▾
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 지금 몇 곳이 보이는지 */}
          <div aria-live="polite" className="space-y-1">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-ink-900">
              <span>{countText}</span>
              {anyCondition && (
                <button type="button" onClick={clearAll} className="lr-link text-[15px] font-semibold">
                  {labels.searchClear}
                </button>
              )}
            </p>
            {regionFromQuery && isLocal && (
              <p className="text-sm text-ink-500">{labels.regionFromSearch.replace('{region}', regionLabel)}</p>
            )}
          </div>
        </div>
      </div>

      {/* 결과가 없을 때: "없음"으로 끝내지 않고 다음에 할 수 있는 일을 알려줍니다. */}
      {shown.length === 0 && (
        <div className="lr-container py-12">
          <div className="lr-card max-w-3xl p-6 sm:p-7">
            <h2 className="text-lg font-extrabold text-ink-900">{labels.emptyTitle}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{labels.emptyBody}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={clearAll} className="lr-btn lr-btn-primary lr-btn-sm lr-press">
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

      {isLocal ? (
        <>
          {/* 그 지역 기관 (없으면 기관을 만들어 채우지 않고 가족센터 찾기로 안내) */}
          {(localItems.length > 0 || !hasLocalData || nationwideItems.length > 0) && (
            <Section id="local" title={labels.localTitle.replace('{region}', regionLabel)}>
              {localItems.length > 0 ? (
                grid(localItems)
              ) : hasLocalData ? (
                <p className="lr-card max-w-3xl px-4 py-3 text-[15px] leading-relaxed text-ink-700">
                  {labels.localNoMatch.replace('{region}', regionLabel)}
                </p>
              ) : (
                <div className="lr-card max-w-3xl p-5 sm:p-6">
                  <h3 className="text-lg font-extrabold text-ink-900">{labels.familyTitle}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
                    {labels.noRegional.replace('{region}', regionLabel)}
                  </p>
                  {family && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={family.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${labels.familyButton} (${labels.openInNew})`}
                        className="lr-btn lr-btn-primary lr-press whitespace-nowrap"
                      >
                        <Icon name="external" size={18} /> {labels.familyButton}
                      </a>
                      {family.phone && (
                        <a
                          href={`tel:${family.phone.replace(/[^\d+]/g, '')}`}
                          className="lr-btn lr-btn-ghost lr-press whitespace-nowrap"
                        >
                          <Icon name="phone" size={18} /> {family.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* 전국 어디서나 이용할 수 있는 곳 */}
          {nationwideItems.length > 0 && (
            <Section id="nationwide" title={labels.nationwideTitle}>
              {grid(nationwideItems)}
            </Section>
          )}
        </>
      ) : (
        visibleGroups.map((group) => (
          <Section key={group.key} id={group.key} title={group.title}>
            {grid(group.items)}
          </Section>
        ))
      )}
    </>
  );
}

function DirectoryCard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
