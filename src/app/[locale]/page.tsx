// 홈(첫 화면)입니다.
//
// 처음 온 사람이 "그래서 나는 뭘 먼저 봐야 하지?"라고 헤매지 않도록, 위에서부터 이렇게 이어집니다.
//   1. 첫 화면(소개 영상 + 한 줄 메시지)
//   2. 무엇이 궁금한가요? (AI 입력칸은 여기 1단계에 한 번만 둡니다)
//      무엇이 필요한가요? — 권리정보 / AI에게 물어보기 / 체크리스트 / 도움받을 곳 네 가지 진입점
//      (각각 "언제 쓰는 기능인지"를 한 줄로 적어, 무엇을 고를지 바로 알 수 있게 합니다)
//   3. 나는 누구인가요? — 청소년 · 대학생 멘토 · 학교/기관
//   4. LINKRIGHTS 소개 (누구를 위한 곳 · 어떤 도움 · 어떻게 쓰나요 · 함께하는 곳)
//   5. 어떤 상황에 있나요 (분야)
//   7. 지금 등록된 자료 (실제로 등록된 것만 센 숫자)
//   8. 많이 찾는 권리정보 → 9. 체크리스트 → 10. 도움받을 곳 → 11. 자주 묻는 질문 · 질문 게시판
//
// 홈에 기능을 계속 더하지 않습니다. 프로그램·SDGs·협력기관 소개처럼 자세한 내용은
// 소개(/about) · 프로그램(/programs) · 함께하기(/get-involved) 페이지에서 보여주고 여기서는 링크만 둡니다.

import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { AskBox } from '@/components/AskBox';
import { HomeHelpFinder } from '@/components/HomeHelpFinder';
import { HomeHero } from '@/components/HomeHero';
import { Icon, type IconName } from '@/components/Icon';
import { Reveal } from '@/components/Reveal';
import { RightsSearchForm } from '@/components/RightsSearchForm';
import { Section } from '@/components/Section';
import { Testimonials } from '@/components/Testimonials';
import {
  getAbout,
  getArticles,
  getCategories,
  getCategory,
  getChecklists,
  getFaq,
  getFeaturedArticles,
  getNationwideOrganizations,
  getOrganizations,
  getPartners,
  getPrograms,
  getSite,
  getTestimonials,
  lastReviewedAt,
  resolveOrganizations,
} from '@/lib/content';
import { LOCALES, formatDate, getMessages, pick, toLocale } from '@/lib/i18n';
import { REGIONS } from '@/lib/regions';
import { searchSuggestions } from '@/lib/search';
import impact from '../../../content/impact.json';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const site = getSite();
  const categories = getCategories();
  // 홈에는 많이 찾는 권리정보 3개와 체크리스트 2개만 보여줍니다. (한 화면에 너무 많지 않게, 나머지는 각 목록에서)
  const featured = getFeaturedArticles(3);
  const checklists = getChecklists();
  const homeChecklists = checklists.slice(0, 2);
  const about = getAbout().i18n[locale] ?? getAbout().i18n.ko;
  const partners = getPartners();
  // 홈에는 content/faq.json 에서 featured 로 표시한 핵심 질문(최대 4개)만 보여주고, 나머지는 FAQ 페이지에서 봅니다.
  const faq = getFaq().items.filter((item) => item.featured).slice(0, 4);
  const examples = site.exampleQuestions[locale] ?? site.exampleQuestions.ko;
  // 검색창 자동완성: 등록된 권리정보의 키워드에서만 가져옵니다.
  const suggestions = searchSuggestions(locale);

  // 소개 영상: 팀이 만든 LINKRIGHTS 소개 영상 전체(화질 개선본 "링크라이츠 화질", 자르지 않은 웹용 압축본, 소리 없음).
  // 데스크톱·태블릿은 1920×1080, 휴대폰은 세로 화면에 맞춰 가운데를 자른 세로 영상입니다.
  // public 폴더에 파일이 있을 때만 씁니다. (없으면 대표 이미지 또는 네이비 배경만)
  const publicFile = (file: string) => fs.existsSync(path.join(process.cwd(), 'public', file));
  const heroVideo = {
    desktop: '/videos/linkrights-hero-1080.mp4',
    mobile: '/videos/linkrights-hero-mobile.mp4',
    poster: '/images/hero-poster-hd.jpg',
  };
  // 첫 화면 긴급 연락처는 등록된 기관(content/organizations.json)의 번호만 씁니다.
  const heroContacts = resolveOrganizations(['police-112', 'fire-119']).map((org) => ({
    id: org.id,
    name: pick(org.name, locale),
    phone: org.phone,
  }));

  // 2. 무엇이 궁금한가요? ② 내 권리 확인하기: 권리정보와 체크리스트 (각 기능을 "언제 쓰는지"로 구분합니다)
  const checkPoints: { key: string; icon: IconName; title: string; body: string; href: string }[] = [
    { key: 'rights', icon: 'book', title: t.homeStart.rightsTitle, body: t.homeStart.rightsBody, href: `/${locale}/rights` },
    {
      key: 'checklist',
      icon: 'check',
      title: t.homeStart.checklistTitle,
      body: t.homeStart.checklistBody,
      href: `/${locale}/checklists`,
    },
  ];
  const stepTitle = 'flex items-center gap-2.5 text-lg font-extrabold text-ink-900 sm:text-xl';
  const stepNumber =
    'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[15px] font-bold text-white';
  // ③ 도움받을 곳: 등록된 기관 수 (전국 기관 / 지역 기관)
  const nationwideCount = getNationwideOrganizations().length;
  const orgCounts = { nationwide: nationwideCount, local: getOrganizations().length - nationwideCount };

  // 지금 등록된 자료 수: 모두 등록된 자료를 그대로 센 값입니다. (임의의 숫자를 넣지 않습니다)
  const stats: { key: string; label: string; value: number; unit: string; note?: string }[] = [
    { key: 'articles', label: t.home.impactArticles, value: getArticles().length, unit: t.home.impactArticlesUnit },
    {
      key: 'organizations',
      label: t.home.impactOrganizations,
      value: getOrganizations().length,
      unit: t.home.impactOrganizationsUnit,
    },
    { key: 'programs', label: t.home.statsPrograms, value: getPrograms().items.filter((p) => p.status === 'published').length, unit: t.home.statsProgramsUnit },
    { key: 'languages', label: t.home.impactLanguages, value: LOCALES.length, unit: t.home.impactLanguagesUnit },
    {
      key: 'participants',
      label: t.home.impactParticipants,
      value: impact.participants.count,
      unit: t.home.impactParticipantsUnit,
      note: formatDate(impact.participants.as_of, locale),
    },
  ];
  // 마지막 업데이트: 등록된 자료의 검토일 중 가장 최근 날짜 (자료를 고치면 함께 바뀝니다)
  const lastUpdated = lastReviewedAt();

  const viewAll = (href: string) => (
    <Link href={href} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
      {t.common.viewAll} <Icon name="arrow-right" size={16} />
    </Link>
  );

  return (
    <>
      {/* 1. 첫 화면: 소개 영상 전체 + 핵심 메시지 -------------------- */}
      <HomeHero
        rightsHref={`/${locale}/rights`}
        askHref={`/${locale}/ask`}
        emergencyHref={`/${locale}/emergency`}
        contacts={heroContacts}
        sources={
          publicFile(heroVideo.desktop)
            ? { desktop: heroVideo.desktop, mobile: publicFile(heroVideo.mobile) ? heroVideo.mobile : undefined }
            : undefined
        }
        poster={publicFile(heroVideo.poster) ? heroVideo.poster : undefined}
        labels={{
          eyebrow: t.homeBrand.eyebrow,
          title: t.home.heroTitle,
          subtitle: t.home.heroSubtitle,
          ctaRights: t.home.ctaRights,
          ctaAsk: t.home.ctaAsk,
          emergency: t.home.emergencyBanner,
          call: t.nav.emergencyCall,
          scrollDown: t.homeBrand.scrollDown,
          play: t.heroVideo.play,
          pause: t.heroVideo.pause,
        }}
      />

      {/* 1-1. 시범 운영 안내 ------------------------------------------
          아직 고쳐 나가는 중이라는 것을 첫 화면에서 먼저 알립니다. (의견을 보내는 곳으로 이어 줍니다) */}
      <div className="border-b border-[var(--color-line)] bg-warm-100">
        <div className="lr-container flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
          <p className="text-[15px] leading-relaxed text-ink-900">
            <span className="font-bold">{t.home.betaTitle}</span> <span className="text-ink-700">{t.home.betaBody}</span>
          </p>
          <Link href={`/${locale}/get-involved#feedback`} className="lr-link text-[15px] font-semibold">
            {t.home.betaCta}
          </Link>
        </div>
      </div>

      {/* 2. 무엇이 궁금한가요?: LINKRIGHTS 흐름 그대로 세 단계 ----------------
          ① 내 상황 알아보기(키워드 검색 / AI 질문) → ② 내 권리 확인하기(권리정보 / 체크리스트) → ③ 필요하면 도움받을 곳 찾기
          검색과 AI 질문은 역할을 나눠 적습니다: 검색 = 이미 아는 낱말로 찾기, AI = 내 상황을 문장으로 설명하기 */}
      <section id="home-start" className="scroll-mt-20 border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-14 sm:py-20">
          <h2 className="lr-h2">{t.homeFind.title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-[17px]">{t.homeFind.subtitle}</p>

          {/* ① 내 상황 알아보기 */}
          <div id="home-step-1" className="mt-8 scroll-mt-24">
            <h3 className={stepTitle}>
              <span className={stepNumber}>1</span> {t.homeFind.flow[0]}
            </h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="lr-card p-5 sm:p-6">
                <RightsSearchForm
                  locale={locale}
                  suggestions={suggestions}
                  bare
                  title={t.homeFind.searchTitle}
                  hint={t.homeFind.searchBody}
                  showAskLink={false}
                />
              </div>
              {/* AI 입력칸은 이 한 곳에만 둡니다. 예전에는 아래에 같은 칸이 하나 더 있었는데,
                  첫 화면에서 같은 것을 두 번 묻는 셈이라 여기 1단계로 합쳤습니다. */}
              <div className="lr-card flex flex-col p-5 sm:p-6">
                <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink-900">
                  <Icon name="sparkles" size={20} className="shrink-0 text-brand-600" /> {t.homeFind.askTitle}
                </p>
                {/* 무엇을 적는 칸인지는 아래 입력칸의 안내에 한 번만 적습니다. (같은 말을 두 번 읽지 않게) */}
                <div className="mt-4">
                  <AskBox locale={locale} examples={examples} />
                </div>
                <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
                  <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-brand-600" /> <span>{t.homeAsk.trust}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ② 내 권리 확인하기: 분야를 고르면 그 분야의 권리정보로 갑니다. (전체 목록·체크리스트는 아래 링크로) */}
          <div id="home-step-2" className="mt-8 scroll-mt-24">
            <h3 className={stepTitle}>
              <span className={stepNumber}>2</span> {t.homeFind.flow[1]}
            </h3>
            {/* "도움받을 곳"은 아래 ③단계에서 지역으로 찾으므로 여기 목록에서는 뺍니다. */}
            <ul className="mt-4 grid border-t border-[var(--color-line)] sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
              {categories
                .filter((category) => category.kind !== 'directory')
                .map((category) => (
                <li key={category.id} className="border-b border-[var(--color-line)]">
                  <Link
                    href={`/${locale}/rights/${category.id}`}
                    className="group flex items-center gap-4 py-4"
                  >
                    <Icon name={category.icon as IconName} size={22} className="shrink-0 text-brand-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink-900 group-hover:text-brand-700">
                        {pick(category.name, locale)}
                      </span>{' '}
                      <span className="mt-0.5 block text-sm leading-snug text-ink-500">{pick(category.tagline, locale)}</span>
                    </span>
                    <Icon
                      name="arrow-right"
                      size={18}
                      className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {checkPoints.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="lr-link inline-flex items-center gap-1.5 text-[15px] font-semibold"
                >
                  <Icon name={item.icon} size={16} /> {item.title}
                </Link>
              ))}
            </div>
          </div>

          {/* ③ 필요하면 도움받을 곳 찾기: 일반 상담(지역 선택)과 긴급 상황을 나눠서 */}
          <div id="home-step-3" className="mt-8 scroll-mt-24">
            <h3 className={stepTitle}>
              <span className={stepNumber}>3</span> {t.homeFind.flow[2]}
            </h3>
            <div className="mt-4">
              <HomeHelpFinder
                locale={locale}
                regions={REGIONS.map((region) => ({ key: region.key, label: pick(region.name, locale) }))}
                counts={orgCounts}
                contacts={heroContacts}
                labels={{
                  title: t.homeHelp.title,
                  body: t.homeHelp.body,
                  regionLabel: t.homeHelp.regionLabel,
                  allRegions: t.orgFinder.allRegions,
                  nationwideOnly: t.orgFinder.nationwideOnly,
                  submit: t.homeHelp.submit,
                  count: t.homeHelp.count,
                  emergencyTitle: t.homeHelp.emergencyTitle,
                  emergencyBody: t.homeHelp.emergencyBody,
                  emergencyMore: t.homeHelp.emergencyMore,
                  call: t.nav.emergencyCall,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. LINKRIGHTS 소개: 누가 만들고 운영하는 곳인지 한눈에. (자세한 이야기는 소개 페이지에서) ------ */}
      <section id="home-intro" className="scroll-mt-20 border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="lr-eyebrow">LINKRIGHTS</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[2.25rem]">
                {about.hero_title}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-700">{about.hero_body}</p>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-500">{about.change_body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link href={`/${locale}/about`} className="lr-link inline-flex items-center gap-1.5 text-[15px] font-semibold">
                  {t.nav.about} <Icon name="arrow-right" size={16} />
                </Link>
                <Link
                  href={`/${locale}/about#why-youth`}
                  className="lr-link inline-flex items-center gap-1.5 text-[15px] font-semibold"
                >
                  {t.about.whyYouthNav} <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </div>

            {/* 운영 주체와 함께하는 곳: content/site.json 의 운영 주체, content/partners.json 의 관계 표시를 그대로 씁니다. */}
            <div className="lg:col-span-5">
              <dl className="space-y-4 border-t-2 border-navy-900 pt-5 text-[15px] leading-relaxed">
                <div>
                  <dt className="font-bold text-ink-900">{t.footerNav.operatorLabel}</dt>
                  <dd className="mt-0.5 text-ink-700">{pick(site.operator, locale)}</dd>
                </div>
                {partners.length > 0 && (
                  <div>
                    <dt className="font-bold text-ink-900">{t.homeIntro.partnerLabel}</dt>
                    {/* 등록된 공식 주소가 있는 기관은 눌러서 그 기관 누리집으로 갈 수 있습니다. */}
                    <dd className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-ink-700">
                      {partners.map((partner) => {
                        const label = `${pick(partner.name, locale)} (${pick(partner.relation, locale)})`;
                        return partner.url ? (
                          <a
                            key={partner.id}
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${label} (${t.common.openInNew})`}
                            className="lr-link inline-flex items-center gap-1 font-semibold"
                          >
                            {label} <Icon name="external" size={14} />
                          </a>
                        ) : (
                          <span key={partner.id}>{label}</span>
                        );
                      })}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-bold text-ink-900">{t.homeIntro.whoLabel}</dt>
                  <dd className="mt-0.5 text-ink-700">{t.homeIntro.whoBody}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>


      {/* 5. 지금 등록된 자료 ------------------------------------------
          실제로 등록된 것만 세어 보여줍니다. (숫자는 자료가 늘면 함께 늘어납니다)
          "최근에 새로 만들거나 검토한 것" 목록은 첫 방문자에게 큰 의미가 없어 뺐습니다. */}
      {
        <section aria-labelledby="stats-title" className="bg-navy-900 text-white">
          <div className="lr-container py-14 sm:py-16">
            <div>
              <h2 id="stats-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {t.home.statsTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/75 sm:text-base">
                {t.home.statsSubtitle}
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
                {stats.map((stat) => (
                  <div key={stat.key}>
                    <dt className="text-[13px] font-semibold leading-snug text-white/70">{stat.label}</dt>
                    <dd className="mt-1.5 text-3xl font-extrabold tabular-nums sm:text-4xl">
                      {stat.value}
                      {stat.unit && <span className="ml-0.5 align-baseline text-base font-bold text-white/70">{stat.unit}</span>}
                    </dd>
                    {stat.note && <p className="mt-1 text-[13px] text-white/60">{stat.note}</p>}
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[13px] leading-relaxed text-white/60">
                <span className="font-semibold text-white/75">
                  {t.home.statsUpdated} {formatDate(lastUpdated, locale)}
                </span>{' '}
                · {t.home.statsNote}
              </p>
            </div>
          </div>
        </section>
      }

      {/* 7-1. 실제 참여자 후기: content/testimonials.json 에 공개 동의를 받아 등록한 후기가 있을 때만 */}
      <Testimonials items={getTestimonials()} t={t} locale={locale} />

      {/* 6. 많이 찾는 권리정보 -------------------------------------- */}
      <Section title={t.home.featuredTitle} subtitle={t.home.featuredSubtitle} action={viewAll(`/${locale}/rights`)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((article, index) => (
            <Reveal key={article.id} index={index}>
              <ArticleCard article={article} locale={locale} />
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 7. 체크해보기: 상황별 체크리스트 (content/checklists) ---------- */}
      {checklists.length > 0 && (
        <Section
          tone="soft"
          title={t.checklist.homeTitle}
          subtitle={t.checklist.homeSubtitle}
          action={viewAll(`/${locale}/checklists`)}
        >
          <ul className="grid gap-4 md:grid-cols-2">
            {homeChecklists.map((checklist, index) => {
              const body = checklist.i18n[locale] ?? checklist.i18n.ko;
              const category = getCategory(checklist.category);
              return (
                <Reveal key={checklist.id} index={index} className="lr-card lr-card-hover group relative flex flex-col p-6">
                  {category && <span className="text-sm font-semibold text-brand-700">{pick(category.name, locale)}</span>}{' '}
                  <h3 className="mt-1.5 text-lg font-extrabold leading-snug text-ink-900 group-hover:text-brand-800">
                    <Link
                      href={`/${locale}/checklists/${checklist.id}`}
                      className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
                    >
                      {body.title}
                    </Link>
                  </h3>{' '}
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-500">{body.summary}</p>
                  <p className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-brand-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="check" size={16} /> {t.checklist.itemCount.replace('{n}', String(checklist.items.length))}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {t.checklist.open} <Icon name="arrow-right" size={16} />
                    </span>
                  </p>
                </Reveal>
              );
            })}
          </ul>
        </Section>
      )}

      {/* 8. 자주 묻는 질문 + 질문 게시판 ----------------------------- */}
      <Section tone="soft" title={t.home.faqTitle} action={viewAll(`/${locale}/faq`)}>
        <ul className="lr-card divide-y divide-[var(--color-line)] overflow-hidden">
          {faq.map((item) => (
            <li key={item.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left text-base font-bold leading-snug text-ink-900 hover:bg-surface-soft sm:px-6 [&::-webkit-details-marker]:hidden">
                  {/* 질문은 왼쪽 정렬, 아이콘은 오른쪽 첫 줄에 고정 (두 줄이 되어도 겹치지 않게) */}
                  <span className="min-w-0 flex-1">{pick(item.q, locale)}</span>
                  <span
                    className="grid h-[22px] w-5 shrink-0 place-items-center text-ink-300 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-700 sm:px-6">{pick(item.a, locale)}</p>
              </details>
            </li>
          ))}
        </ul>

        {/* 찾는 질문이 없을 때 직접 물어볼 수 있는 곳 */}
        <div className="lr-card mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-ink-900">{t.home.qnaTitle}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{t.home.qnaSubtitle}</p>
          </div>
          <Link href={`/${locale}/qna`} className="lr-btn lr-btn-ghost lr-press shrink-0">
            {t.qna.navLabel} <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </Section>
    </>
  );
}
