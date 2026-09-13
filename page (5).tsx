// 도움받을 수 있는 기관 목록 페이지입니다.

import type { Metadata } from 'next';
import { OrgCard } from '@/components/OrgCard';
import { PageHeader, Section } from '@/components/Section';
import { getOrganizations } from '@/lib/content';
import { getMessages, toLocale } from '@/lib/i18n';

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

  return (
    <>
      <PageHeader title={t.organizations.title} subtitle={t.organizations.subtitle} />

      {/* 분류 바로가기 */}
      <div className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container flex flex-wrap gap-2 py-4">
          {ORDER.filter((key) => organizations.some((org) => org.category === key)).map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[15px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {t.organizations.categories[key]}
            </a>
          ))}
        </div>
      </div>

      {ORDER.map((key) => {
        const group = organizations.filter((org) => org.category === key);
        if (group.length === 0) return null;
        return (
          <Section key={key} id={key} title={t.organizations.categories[key]}>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((org) => (
                <li key={org.id}>
                  <OrgCard org={org} locale={locale} />
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </>
  );
}
