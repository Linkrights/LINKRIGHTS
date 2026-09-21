// LINKRIGHTS 소개 페이지입니다. 글 내용은 content/about.json 에서 바꿉니다.
//
// 이야기 순서: 왜 시작했는가 → 우리가 주목한 문제 → 하는 일 → 만들고 싶은 변화
//            → 만들고 싶은 선순환(5단계, messages 의 cycle) → 프로그램 → 협력기관 → SDGs → 팀과 앞으로의 방향
// 선순환은 이미 이룬 성과가 아니라 만들어 가고 있는 목표로 표현합니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { PartnerList } from '@/components/PartnerList';
import { SdgIcon, sdgAnchor } from '@/components/SdgIcon';
import { Notice, PageHeader, Section } from '@/components/Section';
import { getAbout, getPartners, getPrograms } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

/**
 * "왜 시작했는가" 글을 앞 문장 / 따옴표로 묶인 말들 / 뒷 문장으로 나눕니다. (글 내용은 그대로, 줄바꿈과 모양만 정리)
 * 따옴표("…" 또는 “…”)가 없으면 전체를 한 문단으로 둡니다.
 */
function splitQuotes(text: string): { before: string; quotes: string[]; after: string } | null {
  const matches = [...text.matchAll(/"[^"]+"|“[^”]+”/g)];
  if (matches.length === 0) return null;
  const first = matches[0].index ?? 0;
  const last = matches[matches.length - 1];
  return {
    before: text.slice(0, first).trim(),
    quotes: matches.map((match) => match[0]),
    after: text.slice((last.index ?? 0) + last[0].length).trim(),
  };
}

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
  const hasPartners = getPartners().length > 0;
  const why = splitQuotes(about.why_body);

  return (
    <>
      <PageHeader kicker={t.about.title} title={about.hero_title} subtitle={about.hero_body} />

      {fallback && (
        <div className="lr-container pt-6">
          <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />
        </div>
      )}

      {/* 1. 왜 시작했는가 */}
      <Section title={about.why_title}>
        {why ? (
          <div className="max-w-3xl">
            {why.before && <p className="lr-lead text-pretty">{why.before}</p>}
            {/* 청소년에게서 들은 말: 한 줄에 하나씩 */}
            <ul className="mt-6 space-y-2 border-l-4 border-brand-500 pl-5 sm:pl-6">
              {why.quotes.map((quote) => (
                <li key={quote} className="text-balance text-xl font-bold leading-snug text-navy-900 sm:text-2xl">
                  {quote}
                </li>
              ))}
            </ul>
            {why.after && <p className="lr-lead mt-6 text-pretty">{why.after}</p>}
          </div>
        ) : (
          <p className="lr-lead max-w-3xl text-pretty">{about.why_body}</p>
        )}
      </Section>

      {/* 2. 우리가 주목한 문제 */}
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

      {/* 3. 하는 일: 문제에 대한 우리의 방법 */}
      <Section title={about.what_title}>
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

      {/* 4. 만들고 싶은 변화 */}
      <Section tone="soft">
        <div className="rounded-[var(--radius-panel)] bg-brand-600 px-6 py-10 text-white sm:px-10 sm:py-14">
          <h2 className="text-2xl font-extrabold leading-snug sm:text-3xl">{about.change_title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-brand-50 sm:text-lg">{about.change_body}</p>
        </div>
      </Section>

      {/* 5. 만들고 싶은 선순환: 권리를 알고 → 도움을 찾고 → 선택하고 → 나누고 → 다음 사람에게 더 잘 닿기 */}
      <Section title={t.cycle.title} subtitle={t.cycle.subtitle}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {t.cycle.steps.map((step, index) => (
            <li key={step.title} className="lr-card flex flex-col p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-[15px] font-bold text-white">
                {index + 1}
                <span className="sr-only">.</span>
              </span>{' '}
              <h3 className="lr-h3 mt-3">{step.title}</h3>{' '}
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex items-start gap-2 text-[15px] font-semibold leading-relaxed text-brand-700">
          <Icon name="arrow-right" size={16} className="mt-1 shrink-0" /> <span>{t.cycle.loopNote}</span>
        </p>
      </Section>

      {/* 6. 프로그램 */}
      <Section
        tone="soft"
        title={t.programs.title}
        action={
          <Link href={`/${locale}/programs`} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
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

      {/* 7. 협력기관 (content/partners.json 에 등록된 기관만) */}
      {hasPartners && (
        <Section
          title={t.involved.partnersTitle}
          subtitle={t.involved.partnersSubtitle}
          action={
            <Link href={`/${locale}/get-involved`} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
              {t.nav.getInvolved} <Icon name="arrow-right" size={16} />
            </Link>
          }
        >
          <PartnerList locale={locale} />
        </Section>
      )}

      {/* 8. SDGs */}
      <Section tone={hasPartners ? 'soft' : 'default'} title={about.sdg_title}>
        {/* 목표는 아이콘 + 한 줄 목표를 먼저 크게 보여주고, 설명은 그 아래 작은 글씨로 둡니다.
            자세한 이야기는 아래의 "왜 이 목표를 이야기하는지" 부분에서 이어집니다. */}
        <ul className="grid gap-5 sm:grid-cols-2">
          {about.sdgs.map((sdg) => {
            const detail = about.sdg_details?.find((item) => item.code === sdg.code);
            return (
              <li key={sdg.code} className="lr-card flex gap-4 p-5 sm:p-6">
                <SdgIcon code={sdg.code} />{' '}
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-[0.04em] text-brand-700">
                    {sdg.code} · {sdg.name}
                  </p>{' '}
                  {sdg.goal && <p className="mt-1 text-lg font-extrabold leading-snug text-ink-900">{sdg.goal}</p>}{' '}
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{sdg.body}</p>
                  {detail && (
                    <a href={`#${sdgAnchor(sdg.code)}`} className="lr-link mt-3 inline-flex items-center gap-1 text-[15px] font-semibold">
                      {detail.title} <Icon name="arrow-right" size={16} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {about.sdg_link && <p className="lr-lead mt-8 max-w-3xl font-semibold text-ink-900">{about.sdg_link}</p>}

        {/* SDG 4 · SDG 10 이 각각 LINKRIGHTS의 목적과 이어지는 방식 (content/about.json 의 sdg_details) */}
        {(about.sdg_details ?? []).map((detail) => (
          <div key={detail.code} id={sdgAnchor(detail.code)} className="mt-12 scroll-mt-24 border-t-2 border-navy-900 pt-8">
            <div className="flex items-center gap-3">
              <SdgIcon code={detail.code} size="sm" />
              <h3 className="text-xl font-extrabold leading-snug text-ink-900 sm:text-2xl">{detail.title}</h3>
            </div>
            {detail.body && <p className="lr-lead mt-4 max-w-3xl">{detail.body}</p>}
            {detail.points && detail.points.length > 0 && (
              <ol className="mt-8 grid gap-8 md:grid-cols-3">
                {detail.points.map((point, index) => (
                  <li key={point.title}>
                    <span className="text-2xl font-extrabold tabular-nums text-brand-600">
                      {String(index + 1).padStart(2, '0')}
                      <span className="sr-only">.</span>
                    </span>{' '}
                    <h4 className="lr-h3 mt-2">{point.title}</h4>{' '}
                    <p className="lr-body mt-1.5">{point.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </Section>

      {/* 9. 팀 + 앞으로의 방향 */}
      <Section tone={hasPartners ? 'default' : 'soft'}>
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
