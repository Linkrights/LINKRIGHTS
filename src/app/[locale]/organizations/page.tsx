// 도움받을 수 있는 기관 목록 페이지입니다.
// 기관 정보는 content/organizations.json 에 등록된 것만 보여줍니다.
//
// 좁혀 보는 방법 세 가지 (함께 쓸 수 있습니다. OrgDirectory 참고)
//   1) 키워드 검색 — "임금", "알바", "학교", "비자", "병원", "상담", "외국인등록", "체류", "차별" 등
//   2) 지역 — 전체 지역 / 전국 기관만 / 17개 시·도 (고른 지역 기관 → 전국 기관 순서)
//   3) 분야 — 노동·임금 / 법률 / 체류·비자 … (기관 데이터의 topics)
// 기관 종류(긴급 / 청소년기관 / 이주민 지원 / 공공기관 / 법률 상담)는 목록의 묶음 제목으로 씁니다.
//
// 검색에 쓰는 글(searchText)은 여기에서 등록된 자료만 모아 미리 만듭니다.
// 기관 이름뿐 아니라 설명·종류·분야·지역·주소·언어·전화번호와, 그 기관과 연결된 등록 권리정보의 제목·키워드까지 넣습니다.
// 위쪽에 "전화하기 전에 이렇게 말해보세요" 도움말을 둡니다.

import type { Metadata } from 'next';
import { CallScript } from '@/components/CallScript';
import { OrgCard } from '@/components/OrgCard';
import { OrgDirectory, type DirectoryGroup } from '@/components/OrgDirectory';
import { Reveal } from '@/components/Reveal';
import { PageHeader } from '@/components/Section';
import { getArticles, getOrganizations, getSearchSynonyms } from '@/lib/content';
import { LOCALES, getMessages, pick, toLocale } from '@/lib/i18n';
import { REGIONS, organizationArea, regionName } from '@/lib/regions';
import { ORG_TOPICS, isOrgTopic } from '@/lib/topics';
import type { Locale, Organization } from '@/lib/types';

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

  /** 기관 하나를 찾을 때 쓰는 글. 등록된 자료에서만 모으고, 없는 말은 만들지 않습니다. */
  function searchTextOf(org: Organization): string {
    const area = organizationArea(org);
    // 이 기관과 연결된 등록 권리정보(그 기관으로 안내하는 글)의 제목과 키워드
    const linked = articles.filter((article) => article.organizations.includes(org.id));
    const linkedText = linked.flatMap((article) => [
      ...LOCALES.map((code) => article.i18n[code]?.title ?? '').filter(Boolean),
      ...article.keywords,
    ]);

    return [
      ...allLocales(org.name),
      ...allLocales(org.description),
      // 기관 종류 이름 (긴급 / 청소년기관 / 이주민 지원 / 공공기관 / 법률 상담)
      ...LOCALES.map((code) => getMessages(code).organizations.categories[org.category]),
      // 분야 이름 (노동·임금 / 법률 / 체류·비자 …)
      ...topicsOf(org).flatMap((topic) => LOCALES.map((code) => getMessages(code).orgTopics[topic])),
      ...allLocales(org.address),
      ...allLocales(org.hours),
      area.nationwide ? LOCALES.map((code) => getMessages(code).orgInfo.nationwide).join(' ') : '',
      ...area.regions.flatMap((key) => LOCALES.map((code) => regionName(key, code))),
      ...(org.languages ?? []),
      org.phone ?? '',
      // 운영팀이 검색용 낱말을 따로 등록해 둔 경우 (content/organizations.json 의 keywords)
      ...(org.keywords ?? []),
      ...linkedText,
    ]
      .filter(Boolean)
      .join(' ');
  }

  const groups: DirectoryGroup[] = ORDER.map((key) => ({
    key,
    title: t.organizations.categories[key],
    items: organizations
      .filter((org) => org.category === key)
      .map((org, index) => {
        const area = organizationArea(org);
        return {
          id: org.id,
          nationwide: area.nationwide,
          regions: area.regions,
          topics: topicsOf(org),
          search: searchTextOf(org),
          // 긴급 연락처는 움직임 없이 처음부터 바로 보여줍니다.
          card:
            key === 'emergency' ? (
              <li>
                <OrgCard org={org} locale={locale} />
              </li>
            ) : (
              <Reveal index={index}>
                <OrgCard org={org} locale={locale} />
              </Reveal>
            ),
        };
      }),
  })).filter((group) => group.items.length > 0);

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
        groups={groups}
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
