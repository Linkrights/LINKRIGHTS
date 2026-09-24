// 프로그램 및 활동 소개 페이지입니다.
// 사진을 넣으려면 public/images 폴더에 사진을 넣고,
// content/programs.json 의 "image" 값에 파일 이름(예: "mentoring.jpg")을 적으세요.
// 활동 종류(tag) 필터는 ProgramList 에 있습니다.

import type { Metadata } from 'next';
import { ProgramList } from '@/components/ProgramList';
import { Notice, PageHeader, Section } from '@/components/Section';
import { getPrograms } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.programs.title, description: t.programs.subtitle };
}

export default async function ProgramsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const file = getPrograms();
  const items = file.items
    .filter((item) => item.status === 'published')
    .map((item) => ({
      id: item.id,
      tagKey: item.tag.ko,
      tag: pick(item.tag, locale),
      title: pick(item.title, locale),
      body: pick(item.body, locale),
      // 등록된 글이 있을 때만 "왜 필요한가요 / 어떤 도움" 을 보여줍니다.
      why: item.why ? pick(item.why, locale) : '',
      helps: item.helps ? pick(item.helps, locale) : '',
      // 운영 정보(기관 관계자용): 등록된 것만
      how: item.how ? pick(item.how, locale) : '',
      audience: item.audience ? pick(item.audience, locale) : '',
      format: item.format ? pick(item.format, locale) : '',
      image: item.image,
    }));

  return (
    <>
      <PageHeader title={t.programs.title} subtitle={t.programs.subtitle} />

      <Section>
        <ProgramList
          items={items}
          allLabel={t.organizations.filterAll}
          groupLabel={t.programs.title}
          labels={{
            why: t.programs.whyLabel,
            helps: t.programs.helpsLabel,
            details: t.programs.detailsLabel,
            how: t.programs.howLabel,
            audience: t.programs.audienceLabel,
            format: t.programs.formatLabel,
          }}
        />
      </Section>

      <Section tone="soft" title={t.programs.communityTitle}>
        <Notice title={t.programs.communityTitle} body={pick(file.community_notice, locale)} />
      </Section>
    </>
  );
}
