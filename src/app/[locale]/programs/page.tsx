// 프로그램 및 활동 소개 페이지입니다.
// 사진을 넣으려면 public/images 폴더에 사진을 넣고,
// content/programs.json 의 "image" 값에 파일 이름(예: "mentoring.jpg")을 적으세요.

import type { Metadata } from 'next';
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
  const items = file.items.filter((item) => item.status === 'published');

  return (
    <>
      <PageHeader title={t.programs.title} subtitle={t.programs.subtitle} />

      <Section>
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="lr-card overflow-hidden">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/images/${item.image}`}
                  alt=""
                  loading="lazy"
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-32 w-full bg-brand-100"
                />
              )}
              <div className="p-5">
                <span className="lr-chip">{pick(item.tag, locale)}</span>
                <h2 className="mt-3 text-lg font-extrabold text-ink-900">{pick(item.title, locale)}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{pick(item.body, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="soft" title={t.programs.communityTitle}>
        <Notice title={t.programs.communityTitle} body={pick(file.community_notice, locale)} />
      </Section>
    </>
  );
}
