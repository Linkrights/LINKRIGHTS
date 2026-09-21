// 도움받을 수 있는 기관 목록 페이지입니다.
// 기관 정보는 content/organizations.json(전국·주요 기관)과 content/organizations-regional.json(운영팀이 조사한 지역 기관)에
// 등록된 것만 보여줍니다.
//
// 좁혀 보는 방법 세 가지 (함께 쓸 수 있습니다. OrgDirectory 참고)
//   1) 키워드 검색 — "임금", "알바", "학교", "비자", "병원", "상담", "외국인등록", "체류", "차별" 등
//   2) 지역 — 전체 지역 / 전국 기관만 / 17개 시·도 (고른 지역 기관 → 전국 기관 순서, 시·군·구 선택)
//   3) 분야 — 노동·임금 / 법률 / 체류·비자 … (기관 데이터의 topics)
// 기관 종류(긴급 / 청소년기관 / 이주민 지원 / 공공기관 / 법률 상담)는 목록의 묶음 제목으로 씁니다.
//
// 지역 기관이 수백 곳이라, 카드를 여기서 모두 그려 보내지 않고 "이 화면 언어로 줄인 기관 정보"만 넘깁니다.
// (OrgDirectory 가 지금 보이는 카드만 그립니다) 검색에 함께 쓰는 낱말(extra)도 등록된 자료에서만 모읍니다.
// 위쪽에 "전화하기 전에 이렇게 말해보세요" 도움말을 둡니다.

import type { Metadata } from 'next';
import { CallScript } from '@/components/CallScript';
import { OrgDirectory, type DirectoryItem } from '@/components/OrgDirectory';
import { PageHeader } from '@/components/Section';
import { getArticles, getOrganizations, getSearchSynonyms } from '@/lib/content';
import { LOCALES, getMessages, pick, toLocale } from '@/lib/i18n';
import { REGIONS, organizationArea, regionName } from '@/lib/regions';
import { ORG_TOPICS, isOrgTopic } from '@/lib/topics';
import type { Locale, LocalizedText, Organization } from '@/lib/types';

const ORDER = ['emergency', 'youth', 'migrant', 'public', 'legal'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.organizations.title, description: t.organizations.subtitle };
}

/** 모든 언어의 문구를 한 줄로 모읍니다. (어떤 언어로 검색해도 같은 기관을 찾을 수 있게) */
function allLocales(text: Partial<Record<Locale, string>> | undefined): string[] {
  if (!text) return [];
  return LOCALES.map((locale) => text[locale] ?? '').filter(Boolean);
}

/** 등록된 분야 중 정해진 값만 (src/lib/topics.ts) */
function topicsOf(org: Organization) {
  return (org.topics ?? []).filter(isOrgTopic);
}

export default async function OrganizationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const organizations = getOrganizations();
  const articles = getArticles();

  /** 이 화면 언어의 문구 하나만 남깁니다. (카드는 이 문구만 씁니다. 번역이 없으면 한국어) */
  function trim(text: Partial<Record<Locale, string>> | undefined): LocalizedText | undefined {
    if (!text) return undefined;
    const value = pick(text, locale);
    return (locale === 'ko' ? { ko: value } : { [locale]: value }) as LocalizedText;
  }

  /** 카드에 쓰는 기관 정보 (등록 자료를 이 화면 언어로 줄인 것. 지도 검색에 쓰는 한국어 주소는 남깁니다) */
  function forLocale(org: Organization): Organization {
    const fields = {
      id: org.id,
      category: org.category,
      emergency: org.emergency,
      name: trim(org.name),
      description: trim(org.description),
      phone: org.phone,
      website: org.website,
      address: org.address
        ? ({ ko: org.address.ko, ...(locale !== 'ko' && org.address[locale] ? { [locale]: org.address[locale] } : {}) } as LocalizedText)
        : undefined,
      hours: trim(org.hours),
      holidays: trim(org.holidays),
      break_time: trim(org.break_time),
      languages: org.languages,
      region: org.region,
      nationwide: org.nationwide,
      regions: org.regions,
      topics: org.topics,
      local_network: org.local_network,
      finder: org.finder,
      area: trim(org.area),
      phone_note: trim(org.phone_note),
      reviewed_at: org.reviewed_at,
      source_url: org.source_url,
    };
    // 비어 있는 칸은 보내지 않습니다. (지역 기관이 많아 화면에 넘기는 양을 줄이기 위해)
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as unknown as Organization;
  }

  /** 전국 기관을 찾을 때 함께 쓰는 낱말: 모든 언어의 이름·설명·종류·분야·지역과, 연결된 등록 권리정보의 제목·키워드 */
  function nationwideExtra(org: Organization): string {
    const linked = articles.filter((article) => article.organizations.includes(org.id));
    return [
      ...allLocales(org.name),
      ...allLocales(org.description),
      ...LOCALES.map((code) => getMessages(code).organizations.categories[org.category]),
      ...topicsOf(org).flatMap((topic) => LOCALES.map((code) => getMessages(code).orgTopics[topic])),
      ...allLocales(org.address),
      LOCALES.map((code) => getMessages(code).orgInfo.nationwide).join(' '),
      ...(org.languages ?? []),
      ...(org.keywords ?? []),
      ...linked.flatMap((article) => [
        ...LOCALES.map((code) => article.i18n[code]?.title ?? '').filter(Boolean),
        ...article.keywords,
      ]),
    ]
      .filter(Boolean)
      .join(' ');
  }

  /** 지역 기관을 찾을 때 함께 쓰는 낱말: 한국어·영어 이름, 시·군·구와 시·도 이름, 종류·분야 이름 (짧게) */
  function regionalExtra(org: Organization): string {
    const area = organizationArea(org);
    const labelLocales: Locale[] = locale === 'ko' ? ['ko'] : ['ko', locale];
    return [
      org.name.ko,
      org.name.en ?? '',
      org.area?.ko ?? '',
      org.area?.en ?? '',
      ...area.regions.flatMap((key) => LOCALES.map((code) => regionName(key, code))),
      ...labelLocales.map((code) => getMessages(code).organizations.categories[org.category]),
      ...topicsOf(org).flatMap((topic) => labelLocales.map((code) => getMessages(code).orgTopics[topic])),
      ...(org.keywords ?? []),
    ]
      .filter(Boolean)
      .join(' ');
  }

  const items: DirectoryItem[] = organizations.map((org) => {
    const area = organizationArea(org);
    return {
      id: org.id,
      category: org.category,
      nationwide: area.nationwide,
      regions: area.regions,
      topics: topicsOf(org),
      areaKey: org.area?.ko ?? '',
      areaLabel: org.area ? pick(org.area, locale) : '',
      org: forLocale(org),
      extra: area.nationwide ? nationwideExtra(org) : regionalExtra(org),
    };
  });

  // 지역 기관이 없는 지역에서 안내할 가족센터 찾기: 등록된 "우리 동네 가족센터"(FamilyNet)의 누리집·전화만 씁니다.
  const familyOrg = organizations.find((org) => org.local_network && org.finder && org.website);
  const family = familyOrg ? { website: familyOrg.website, phone: familyOrg.phone } : undefined;

  // 분야 선택 목록: 기관에 실제로 등록된 분야만 (정해진 순서대로)
  const usedTopics = new Set(organizations.flatMap(topicsOf));
  const topics = ORG_TOPICS.filter((key) => usedTopics.has(key)).map((key) => ({ key, label: t.orgTopics[key] }));

  // 검색창 자동완성: 등록된 기관 종류·분야 이름 + 기관과 연결된 권리정보의 키워드에서만 가져옵니다.
  const linkedIds = new Set(organizations.map((org) => org.id));
  const suggestionSet = new Set<string>(ORDER.map((key) => t.organizations.categories[key]));
  for (const topic of topics) suggestionSet.add(topic.label);
  for (const article of articles) {
    if (!article.organizations.some((id) => linkedIds.has(id))) continue;
    for (const keyword of article.keywords) {
      // 지금 보고 있는 언어에 맞는 낱말만 (한국어 화면에는 한글 낱말)
      const hangul = /[\p{Script=Hangul}]/u.test(keyword);
      const han = /[\p{Script=Han}]/u.test(keyword);
      const fits = locale === 'ko' ? hangul : locale === 'zh' ? han && !hangul : !hangul && !han;
      if (fits && keyword.replace(/\s/g, '').length >= 2) suggestionSet.add(keyword);
    }
  }
  for (const region of REGIONS) suggestionSet.add(pick(region.name, locale));

  return (
    <>
      <PageHeader title={t.organizations.title} subtitle={t.organizations.subtitle} />

      <OrgDirectory
        locale={locale}
        cardLabels={{
          common: t.common,
          orgInfo: t.orgInfo,
          orgTopics: t.orgTopics,
          organizations: t.organizations,
          nav: t.nav,
          languageNames: t.languageNames,
        }}
        items={items}
        groups={ORDER.map((key) => ({ key, title: t.organizations.categories[key] }))}
        regions={REGIONS.map((region) => ({ key: region.key, label: pick(region.name, locale) }))}
        topics={topics}
        family={family}
        synonyms={getSearchSynonyms()}
        suggestions={[...suggestionSet].sort((a, b) => a.localeCompare(b)).slice(0, 60)}
        labels={{ ...t.orgFinder, openInNew: t.common.openInNew }}
      />

      {/* 전화하기 전 도움말 (참고용) */}
      <div className="lr-container pb-14">
        <CallScript t={t} className="max-w-3xl" />
      </div>
    </>
  );
}
