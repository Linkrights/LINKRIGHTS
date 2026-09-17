// 도움받을 수 있는 기관 목록 페이지입니다.
// 기관 정보는 content/organizations.json 에 등록된 것만 보여줍니다.
// "내 지역 선택하기"로 지역을 고르면 그 지역 기관과 전국 기관만 보여줍니다. (OrgDirectory)
// 위쪽에 "전화하기 전에 이렇게 말해보세요" 도움말을 둡니다.

import type { Metadata } from 'next';
import { CallScript } from '@/components/CallScript';
import { OrgCard } from '@/components/OrgCard';
import { OrgDirectory, type DirectoryGroup } from '@/components/OrgDirectory';
import { Reveal } from '@/components/Reveal';
import { PageHeader } from '@/components/Section';
import { getOrganizations } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';
import { REGIONS, organizationArea } from '@/lib/regions';

const ORDER = ['emergency', 'youth', 'migrant', 'public', 'legal'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.organizations.title, description: t.organizations.subtitle };
}

export default async function OrganizationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const organizations = getOrganizations();

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

  return (
    <>
      <PageHeader title={t.organizations.title} subtitle={t.organizations.subtitle} />

      <OrgDirectory
        groups={groups}
        regions={REGIONS.map((region) => ({ key: region.key, label: pick(region.name, locale) }))}
        labels={t.orgFinder}
      />

      {/* 전화하기 전 도움말 (참고용) */}
      <div className="lr-container pb-14">
        <CallScript t={t} className="max-w-3xl" />
      </div>
    </>
  );
}
