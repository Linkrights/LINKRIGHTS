// 긴급 도움 페이지입니다. 위험한 상황일 때 가장 먼저 보이도록 짧고 굵게 구성했습니다.

import type { Metadata } from 'next';
import { EmergencyCard } from '@/components/EmergencyCard';
import { OrgCard } from '@/components/OrgCard';
import { PageHeader, Section } from '@/components/Section';
import { getOrganizations, resolveOrganizations } from '@/lib/content';
import { buildEmergencyCard } from '@/lib/emergency';
import { getMessages, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.emergency.pageTitle, description: t.emergency.pageSubtitle };
}

export default async function EmergencyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const card = buildEmergencyCard(locale);
  const emergencyOrgs = resolveOrganizations(card.organizationIds);
  const supportOrgs = getOrganizations().filter((org) => !card.organizationIds.includes(org.id));

  return (
    <>
      <PageHeader title={t.emergency.pageTitle} subtitle={t.emergency.pageSubtitle} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <EmergencyCard
          locale={locale}
          title={card.title}
          message={card.message}
          steps={card.steps}
          note={card.note}
          organizations={emergencyOrgs}
        />
      </div>

      {supportOrgs.length > 0 && (
        <Section tone="soft" title={t.organizations.title} subtitle={t.organizations.subtitle}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportOrgs.map((org) => (
              <li key={org.id}>
                <OrgCard org={org} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
