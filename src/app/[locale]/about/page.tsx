// LINKRIGHTS 소개 페이지입니다. 글 내용은 content/about.json 에서 바꿉니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Notice, PageHeader, Section } from '@/components/Section';
import { getAbout, getPrograms } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const about = getAbout().i18n[locale] ?? getAbout().i18n.ko;
  return { title: about.hero_title, description: about.hero_body };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const file = getAbout();
  const about = file.i18n[locale] ?? file.i18n.ko;
  const fallback = locale !== 'ko' && !file.i18n[locale];
  const programs = getPrograms().items.filter((p) => p.status === 'published');

  return (
    <>
      <PageHeader kicker={t.about.title} title={about.hero_title} subtitle={about.hero_body} />

      {fallback && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />
        </div>
      )}

      {/* 왜 시작했는가 */}
      <Section title={about.why_title}>
        <p className="max-w-3xl text-base leading-relaxed text-ink-700 sm:text-lg">{about.why_body}</p>
      </Section>

      {/* 우리가 주목한 문제 */}
      <Section tone="soft" title={about.problems_title}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {about.problems.map((problem) => (
            <li key={problem.title} className="rounded-2xl bg-surface-soft p-5">
              <h3 className="font-bold text-ink-900">{problem.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{problem.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 만들고 싶은 변화 */}
      <Section>
        <div className="rounded-3xl bg-brand-600 px-6 py-10 text-white sm:px-10 sm:py-14">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{about.change_title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-brand-50 sm:text-lg">{about.change_body}</p>
        </div>
      </Section>

      {/* 하는 일 */}
      <Section tone="soft" title={about.what_title}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {about.what_we_do.map((item) => (
            <li key={item.title} className="lr-card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name="check" size={18} />
              </span>
              <h3 className="mt-3 font-bold text-ink-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 프로그램 */}
      <Section
        title={t.programs.title}
        action={
          <Link href={`/${locale}/programs`} className="lr-btn lr-btn-ghost">
            {t.common.viewAll}
            <Icon name="arrow-right" size={16} />
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((program) => (
            <li key={program.id} className="lr-card p-5">
              <span className="lr-chip">{pick(program.tag, locale)}</span>
              <h3 className="mt-3 font-bold text-ink-900">{pick(program.title, locale)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{pick(program.body, locale)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* SDGs */}
      <Section tone="soft" title={about.sdg_title}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {about.sdgs.map((sdg, index) => (
            <li key={sdg.code} className="flex gap-4 rounded-2xl bg-surface-soft p-5">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white"
                style={{ background: index === 0 ? 'var(--color-sdg4)' : 'var(--color-sdg10)' }}
              >
                {sdg.code.replace('SDG ', '')}
              </span>
              <div>
                <h3 className="font-bold text-ink-900">
                  {sdg.code} · {sdg.name}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{sdg.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 팀 + 앞으로의 방향 */}
      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="lr-card p-6">
            <h2 className="text-xl font-extrabold text-ink-900">{about.team_title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{about.team_body}</p>
          </div>
          <div className="lr-card p-6">
            <h2 className="text-xl font-extrabold text-ink-900">{about.future_title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{about.future_body}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
