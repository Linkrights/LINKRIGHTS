'use client';

// 도움받을 곳 목록입니다. 세 가지 방법으로 좁혀 볼 수 있고, 함께 쓸 수 있습니다.
//   1) 키워드 검색 — "임금", "알바", "학교", "비자", "병원", "상담", "외국인등록", "체류", "차별" 처럼 하고 싶은 말로 찾기
//      "부산에서 임금 문제 도움받고 싶어요"처럼 문장으로 적어도, 시·도 이름은 지역 선택으로 바꾸고
//      찾는 데 쓰이지 않는 말(도움받고, 싶어요, 문제 …)은 빼고 찾습니다. (src/lib/orgSearch.ts)
//   2) 지역 — 전체 지역 / 전국 기관만 / 17개 시·도 (+ 지역 기관이 여러 시·군·구에 있으면 "시·군·구" 선택)
//   3) 분야 — 노동·임금 / 법률 / 체류·비자 … (기관 데이터의 topics, src/lib/topics.ts)
//
// 기관은 두 종류입니다.
//   - 전국 기관(organizations.json): 어느 지역에서나 이용할 수 있는 곳
//   - 지역 기관(organizations-regional.json 등): 가족센터·청소년상담복지센터처럼 시·군·구마다 있는 곳 (수백 곳)
// 지역 기관이 많아서, 처음 화면(전체 지역)에는 "지역별 기관"에서 지역마다 몇 곳인지 먼저 알려주고, 이어서 전국 기관을 보여줍니다.
// 지역을 고르면 그 지역 기관을 먼저, 이어서 전국 어디서나 이용할 수 있는 곳을 보여줍니다.
// 그 지역으로 등록된 기관이 하나도 없으면, 기관을 만들어 채우지 않고 가족센터 찾기(FamilyNet)로 안내합니다.
//
// 카드는 등록된 기관 정보(이 화면 언어로 줄인 것)로 그립니다. 처음 화면에 보이는 카드만 서버에서 그려지므로
// 지역 기관이 많아도 첫 화면이 무거워지지 않습니다.
// 고른 조건은 주소(?region=서울&area=…&topic=labor&q=임금)에만 남기고 브라우저 저장소나 서버에는 저장하지 않습니다.

import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { OrgCardView, type OrgCardMessages } from './OrgCardView';
import { Reveal } from './Reveal';
import { Section } from './Section';
import { pick } from '@/lib/localize';
import { parseOrgQuery } from '@/lib/orgSearch';
import { NATIONWIDE } from '@/lib/regions';
import { expandWithGroups, normalize, textMatchesQuery, type TermGroup } from '@/lib/searchText';
import type { Locale, Organization } from '@/lib/types';

/** 검색어 최대 길이 (검색어가 주소에 남으므로 짧게 제한합니다) */
export const MAX_ORG_SEARCH_LENGTH = 60;

/** 전체 지역 화면에서 검색어로 찾은 지역 기관을 지역을 고르지 않고 바로 보여주는 최대 개수 (넘으면 지역별 개수만) */
const MAX_DIRECT_REGIONAL = 12;

export interface DirectoryItem {
  id: string;
  /** 기관 종류 (긴급 / 청소년기관 / 이주민 지원 / 공공기관 / 법률 상담) — 목록의 묶음 */
  category: string;
  nationwide: boolean;
  regions: string[];
  /** 이 기관이 도와주는 분야 (organizations.json 의 topics) */
  topics: string[];
  /** 시·군·구 (한국어, 정렬·선택용). 시·도 전체를 맡는 기관은 '' */
  areaKey: string;
  /** 시·군·구 이름 (화면 언어) */
  areaLabel: string;
  /** 카드에 쓰는 기관 정보 (등록 자료를 이 화면 언어로 줄인 것) */
  org: Organization;
  /** 검색에 함께 쓰는 낱말 (다른 언어 이름, 분야·지역 이름, 연결된 권리정보 등). 서버에서 등록 자료로만 만듭니다. */
  extra: string;
}

export interface DirectoryGroup {
  key: string;
  title: string;
}

export function OrgDirectory({
  locale,
  cardLabels,
  items,
  groups,
  regions,
  topics,
  family,
  synonyms = [],
  suggestions = [],
  labels,
}: {
  locale: Locale;
  /** 카드에 쓰는 화면 문구 (4개 언어 문구 파일 전체를 브라우저로 보내지 않도록 필요한 것만) */
  cardLabels: OrgCardMessages;
  items: DirectoryItem[];
  /** 기관 종류 묶음 (보여줄 순서대로) */
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
    areaLabel: string;
    allAreas: string;
    countRegion: string;
    countNationwide: string;
    countAllSplit: string;
    localTitle: string;
    nationwideTitle: string;
    localNoMatch: string;
    regionalTitle: string;
    regionalHint: string;
    regionalMatchHint: string;
    regionChip: string;
    familyTitle: string;
    noRegional: string;
    familyButton: string;
    familyMore: string;
    regionFromSearch: string;
    searchLabel: string;
    searchHint: string;
    searchPlaceholder: string;
    searchButton: string;
    searchClear: string;
    emptyTitle: string;
    emptyBody: string;
    examplesLabel: string;
    examples: string[];
    openInNew: string;
  };
}) {
  /** null = 전체 지역, "전국" = 전국 기관만, 그 밖에는 시·도 key */
  const [region, setRegion] = useState<string | null>(null);
  /** 고른 시·군·구 (한국어 key). null = 전체 */
  const [area, setArea] = useState<string | null>(null);
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
    const areaValue = params.get('area');
    if (fromUrl && areaValue && items.some((item) => item.regions.includes(fromUrl) && item.areaKey === areaValue)) setArea(areaValue);
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
  }, [regions, topics, items]);

  /** 고른 조건을 주소에만 적어 둡니다. (새로고침하거나 링크를 나눠도 같은 화면이 보입니다) */
  function writeUrl(next: { region?: string | null; area?: string | null; topic?: string | null; q?: string }) {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | null | undefined) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    if ('region' in next) set('region', next.region);
    if ('area' in next) set('area', next.area);
    if ('topic' in next) set('topic', next.topic);
    if ('q' in next) set('q', next.q);
    // 예전 주소의 분야(category) 조건은 더 쓰지 않습니다.
    url.searchParams.delete('category');
    window.history.replaceState(null, '', url);
  }

  function chooseRegion(key: string | null) {
    setRegion(key);
    setArea(null);
    setRegionFromQuery(false);
    writeUrl({ region: key, area: null });
  }

  function chooseArea(key: string | null) {
    setArea(key);
    writeUrl({ area: key });
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
      setArea(null);
      setRegionFromQuery(true);
      writeUrl({ q: text, region: found, area: null });
    } else {
      writeUrl({ q: text });
    }
  }

  function clearAll() {
    setDraft('');
    setQuery('');
    setRegion(null);
    setArea(null);
    setTopic(null);
    setRegionFromQuery(false);
    writeUrl({ q: '', region: null, area: null, topic: null });
  }

  // 검색에 쓰는 글: 카드에 보이는 내용(이름·설명·운영시간·주소·전화·시·군·구) + 서버에서 만든 추가 낱말
  const searchById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      const { org } = item;
      map.set(
        item.id,
        [
          pick(org.name, locale),
          pick(org.description, locale),
          org.hours ? pick(org.hours, locale) : '',
          org.address?.ko ?? '',
          org.address ? pick(org.address, locale) : '',
          org.phone,
          item.areaLabel,
          item.extra,
        ].join(' '),
      );
    }
    return map;
  }, [items, locale]);

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

  const isLocal = Boolean(region) && region !== NATIONWIDE;
  const localRegion = isLocal ? (region as string) : '';
  const inTopic = (item: DirectoryItem) => !topic || item.topics.includes(topic);
  const textOf = (item: DirectoryItem) => searchById.get(item.id) ?? '';
  const strictMatch = (item: DirectoryItem) =>
    queryTerms.length === 0 || queryTerms.some((term) => textMatchesQuery(textOf(item), term));
  /** 지금 보는 지역에서 찾아볼 기관들 (검색어 조건 전) */
  const inView = (item: DirectoryItem) =>
    region === NATIONWIDE ? item.nationwide : isLocal ? item.nationwide || item.regions.includes(localRegion) : true;
  const useLoose =
    queryTerms.length > 0 && looseTerms.length > 1 && !items.some((item) => inView(item) && inTopic(item) && strictMatch(item));
  const matchesQuery = (item: DirectoryItem) =>
    useLoose ? looseTerms.some((term) => textMatchesQuery(textOf(item), term)) : strictMatch(item);
  const matches = (item: DirectoryItem) => inTopic(item) && matchesQuery(item);

  const categoryOrder = (key: string) => {
    const index = groups.findIndex((group) => group.key === key);
    return index === -1 ? groups.length : index;
  };

  // --- 전국 기관 ---
  const nationwideItems = items.filter(
    (item) => item.nationwide && !(isLocal && item.regions.includes(localRegion)) && matches(item),
  );

  // --- 고른 지역의 기관 (시·군·구 순서) ---
  const regionItems = isLocal ? items.filter((item) => !item.nationwide && item.regions.includes(localRegion)) : [];
  const hasLocalData = regionItems.length > 0;
  const areaNames = new Map<string, string>();
  for (const item of regionItems) if (item.areaKey && !areaNames.has(item.areaKey)) areaNames.set(item.areaKey, item.areaLabel);
  const areaOptions = [...areaNames]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.key.localeCompare(b.key, 'ko'));
  const localItems = regionItems
    .filter((item) => (!area || !item.areaKey || item.areaKey === area) && matches(item))
    .sort(
      (a, b) =>
        a.areaKey.localeCompare(b.areaKey, 'ko') || categoryOrder(a.category) - categoryOrder(b.category),
    );

  // --- 전체 지역 화면: 조건에 맞는 지역 기관이 지역마다 몇 곳인지 ---
  const regionalMatches = region === null ? items.filter((item) => !item.nationwide && matches(item)) : [];
  const regionCounts = regions
    .map((item) => ({ ...item, count: regionalMatches.filter((org) => org.regions.includes(item.key)).length }))
    .filter((item) => item.count > 0);
  // "김포", "대림동"처럼 검색어로 찾은 지역 기관이 몇 곳뿐이면 지역을 고르지 않아도 바로 보여줍니다.
  const regionOrder = (item: DirectoryItem) => {
    const index = regions.findIndex((entry) => item.regions.includes(entry.key));
    return index === -1 ? regions.length : index;
  };
  const showRegionalCards = Boolean(searchText) && regionalMatches.length > 0 && regionalMatches.length <= MAX_DIRECT_REGIONAL;
  const regionalCards = showRegionalCards
    ? [...regionalMatches].sort((a, b) => regionOrder(a) - regionOrder(b) || a.areaKey.localeCompare(b.areaKey, 'ko'))
    : [];

  const filtered = Boolean(query) || Boolean(topic);
  const regionLabel = regions.find((item) => item.key === region)?.label ?? '';
  const areaName = areaOptions.find((item) => item.key === area)?.label ?? '';
  const total =
    region === null
      ? nationwideItems.length + regionalMatches.length
      : nationwideItems.length + localItems.length;

  const countText =
    region === null
      ? labels.countAllSplit
          .replace('{nationwide}', String(nationwideItems.length))
          .replace('{local}', String(regionalMatches.length))
      : region === NATIONWIDE
        ? labels.countNationwide.replace('{n}', String(nationwideItems.length))
        : labels.countRegion
            .replace('{region}', areaName || regionLabel)
            .replace('{local}', String(localItems.length))
            .replace('{nationwide}', String(nationwideItems.length));

  // 분야 선택 상자에 보여줄 숫자는 지금 고른 지역·검색어 기준으로 셉니다. (0곳인 분야도 고를 수 있게 둡니다)
  const topicCount = (key: string) =>
    items.filter(
      (item) =>
        inView(item) &&
        (!isLocal || item.nationwide || !area || !item.areaKey || item.areaKey === area) &&
        item.topics.includes(key) &&
        matchesQuery(item),
    ).length;

  const selectClass =
    'h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] py-0 pl-3.5 pr-9 text-[15px] font-semibold text-ink-900 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-100';

  const grid = (list: DirectoryItem[]) => (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((item, index) =>
        // 긴급 연락처는 움직임 없이 처음부터 바로 보여줍니다.
        item.category === 'emergency' ? (
          <li key={item.id}>
            <OrgCardView org={item.org} locale={locale} t={cardLabels} />
          </li>
        ) : (
          <Reveal key={item.id} index={index}>
            <OrgCardView org={item.org} locale={locale} t={cardLabels} />
          </Reveal>
        ),
      )}
    </ul>
  );

  const byCategory = (list: DirectoryItem[]) =>
    groups
      .map((group) => ({ ...group, list: list.filter((item) => item.category === group.key) }))
      .filter((group) => group.list.length > 0);

  const selectChevron = (
    <span className="pointer-events-none absolute right-3.5 text-xs text-ink-500" aria-hidden="true">
      ▾
    </span>
  );

  const familyLink = family && (
    <a
      href={family.website}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${labels.familyButton} (${labels.openInNew})`}
      className="lr-btn lr-btn-primary lr-press whitespace-nowrap"
    >
      <Icon name="external" size={18} /> {labels.familyButton}
    </a>
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
                {/* 예시 낱말은 다섯 개만 보여줍니다. (고르는 데 시간이 걸리지 않게) */}
                <ul className="mt-2 flex flex-wrap gap-2">
                  {labels.examples.slice(0, 5).map((term) => (
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

          {/* 2) 지역 · 3) 분야 (선택 상자. 휴대폰에서는 이름이 잘리지 않게 위아래로 놓습니다) */}
          <div className="border-t border-[var(--color-line)] pt-4">
            {/* 지역·분야는 고르는 상자 이름만으로 충분해서, 따로 설명 문단을 두지 않습니다. */}
            <h2 className="text-[15px] font-bold text-ink-900">{labels.filtersTitle}</h2>
            <div className="mt-3 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
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
                  {selectChevron}
                </span>
              </div>
              {isLocal && areaOptions.length > 1 && (
                <div className="min-w-0">
                  <label htmlFor="org-area" className="mb-1 block text-sm font-semibold text-ink-700">
                    {labels.areaLabel}
                  </label>
                  <span className="relative flex items-center">
                    <select
                      id="org-area"
                      value={area ?? ''}
                      onChange={(event) => chooseArea(event.target.value || null)}
                      className={selectClass}
                    >
                      <option value="">{labels.allAreas}</option>
                      {areaOptions.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    {selectChevron}
                  </span>
                </div>
              )}
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
                  {selectChevron}
                </span>
              </div>
            </div>
          </div>

          {/* 지금 몇 곳이 보이는지 */}
          <div aria-live="polite" className="space-y-1">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-ink-900">
              <span>{countText}</span>
              {(filtered || region) && (
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
      {total === 0 && (
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
            <Section id="local" title={labels.localTitle.replace('{region}', areaName || regionLabel)}>
              {localItems.length > 0 ? (
                grid(localItems)
              ) : hasLocalData ? (
                <p className="lr-card max-w-3xl px-4 py-3 text-[15px] leading-relaxed text-ink-700">
                  {labels.localNoMatch.replace('{region}', areaName || regionLabel)}
                </p>
              ) : (
                <div className="lr-card max-w-3xl p-5 sm:p-6">
                  <h3 className="text-lg font-extrabold text-ink-900">{labels.familyTitle}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
                    {labels.noRegional.replace('{region}', regionLabel)}
                  </p>
                  {family && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {familyLink}
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
              {/* 조사된 지역 기관이 있어도 모든 가족센터가 들어 있지는 않으므로, 가족센터 찾기를 함께 알려줍니다. */}
              {hasLocalData && family && (
                <div className="mt-5 flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-3">
                  <p className="text-[15px] leading-relaxed text-ink-700">{labels.familyMore}</p>
                  {familyLink}
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
        <>
          {/* 지역별 기관 (전국 기관보다 먼저): 지역 기관이 수백 곳이라 지역마다 몇 곳인지 보여주고, 검색으로 찾은 몇 곳은 바로 보여줍니다 */}
          {region === null && showRegionalCards && (
            <Section id="regional" title={labels.regionalTitle}>
              {grid(regionalCards)}
            </Section>
          )}
          {region === null && !showRegionalCards && regionCounts.length > 0 && (
            <Section id="regional" title={labels.regionalTitle}>
              <p className="max-w-3xl text-[15px] leading-relaxed text-ink-700">
                {filtered ? labels.regionalMatchHint : labels.regionalHint}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {regionCounts.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => chooseRegion(item.key)}
                      className="lr-press rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-[15px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {labels.regionChip.replace('{region}', item.label).replace('{n}', String(item.count))}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {byCategory(nationwideItems).map((group) => (
            <Section key={group.key} id={group.key} title={group.title}>
              {grid(group.list)}
            </Section>
          ))}
        </>
      )}
    </>
  );
}
