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
        <div className="lr-container pt-6">
          <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />
        </div>
      )}

      {/* 왜 시작했는가 */}
      <Section title={about.why_title}>
        <p className="lr-lead max-w-3xl">{about.why_body}</p>
      </Section>

      {/* 우리가 주목한 문제 */}
      <Section tone="soft" title={about.problems_title}>
        <ol className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {about.problems.map((problem, index) => (
            <li key={problem.title} className="flex gap-4">
              <span className="w-8 shrink-0 pt-0.5 text-[15px] font-extrabold tabular-nums text-brand-600">
                {String(index + 1).padStart(2, '0')}
                <span className="sr-only">.</span>
              </span>{' '}
              <div>
                <h3 className="lr-h3">{problem.title}</h3>{' '}
                <p className="lr-body mt-1.5">{problem.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 만들고 싶은 변화 */}
      <Section>
        <div className="rounded-[var(--radius-panel)] bg-brand-600 px-6 py-10 text-white sm:px-10 sm:py-14">
          <h2 className="text-2xl font-extrabold leading-snug sm:text-3xl">{about.change_title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-brand-50 sm:text-lg">{about.change_body}</p>
        </div>
      </Section>

      {/* 하는 일 */}
      <Section tone="soft" title={about.what_title}>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {about.what_we_do.map((item) => (
            <li key={item.title} className="flex gap-3.5">
              <span className="lr-icon-badge h-10 w-10">
                <Icon name="check" size={20} />
              </span>{' '}
              <div>
                <h3 className="lr-h3">{item.title}</h3>{' '}
                <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 프로그램 */}
      <Section
        title={t.programs.title}
        action={
          <Link href={`/${locale}/programs`} className="lr-btn lr-btn-ghost lr-btn-sm">
            {t.common.viewAll} <Icon name="arrow-right" size={16} />
          </Link>
        }
      >
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((program) => (
            <li key={program.id} className="border-t-2 border-brand-600 pt-5">
              <span className="text-sm font-semibold text-brand-700">{pick(program.tag, locale)}</span>{' '}
              <h3 className="lr-h3 mt-1.5">{pick(program.title, locale)}</h3>{' '}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{pick(program.body, locale)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* SDGs */}
      <Section tone="soft" title={about.sdg_title}>
        <ul className="grid gap-8 sm:grid-cols-2">
          {about.sdgs.map((sdg, index) => (
            <li key={sdg.code} className="flex gap-4">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-control)] text-base font-extrabold text-white"
                style={{ background: index === 0 ? 'var(--color-sdg4)' : 'var(--color-sdg10)' }}
              >
                {sdg.code.replace('SDG ', '')}
              </span>{' '}
              <div>
                <h3 className="lr-h3">
                  {sdg.code} · {sdg.name}
                </h3>{' '}
                <p className="lr-body mt-1">{sdg.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 팀 + 앞으로의 방향 */}
      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="lr-card p-6 sm:p-7">
            <h2 className="text-xl font-extrabold text-ink-900">{about.team_title}</h2>
            <p className="lr-body mt-3">{about.team_body}</p>
          </div>
          <div className="lr-card p-6 sm:p-7">
            <h2 className="text-xl font-extrabold text-ink-900">{about.future_title}</h2>
            <p className="lr-body mt-3">{about.future_body}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
