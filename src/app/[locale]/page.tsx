// 홈(첫 화면)입니다.
//
// 처음 온 사람이 "그래서 나는 뭘 먼저 봐야 하지?"라고 헤매지 않도록, 위에서부터 이렇게 이어집니다.
//   1. 첫 화면(소개 영상 + 한 줄 메시지)
//   2. 무엇이 필요한가요? — 권리정보 / AI에게 물어보기 / 체크리스트 / 도움받을 곳 네 가지 진입점
//      (각각 "언제 쓰는 기능인지"를 한 줄로 적어, 무엇을 고를지 바로 알 수 있게 합니다)
//   3. 나는 누구인가요? — 청소년 · 대학생 멘토 · 학교/기관
//   4. LINKRIGHTS 소개 (누구를 위한 곳 · 어떤 도움 · 어떻게 쓰나요 · 함께하는 곳)
//   5. 어떤 상황에 있나요 (분야)
//   6. 내 상황을 말해 보세요 (AI 입력창)
//   7. 최근에 새로 만들거나 검토한 것 (등록 자료의 실제 날짜로 만듭니다)
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
import { OrgCard } from '@/components/OrgCard';
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
  getQnaPosts,
  getSite,
  getTestimonials,
  resolveArticle,
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
  const featured = getFeaturedArticles(6);
  const checklists = getChecklists();
  const orgs = getNationwideOrganizations().filter((o) => !o.emergency).slice(0, 3);
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

  // LINKRIGHTS가 함께 알려주는 세 가지
  const helpSteps = [
    { title: t.ask.resultRights, body: t.homeBrand.step1 },
    { title: t.ask.resultActions, body: t.homeBrand.step2 },
    { title: t.ask.resultOrgs, body: t.homeBrand.step3 },
  ];
  // 사용하는 방법 세 단계 (각 단계에서 바로 이동)
  const howSteps = [
    { body: t.homeIntro.how1, href: `/${locale}/rights`, label: t.nav.rights },
    { body: t.homeIntro.how2, href: `/${locale}/ask`, label: t.home.ctaAsk },
    { body: t.homeIntro.how3, href: `/${locale}/organizations`, label: t.nav.organizations },
  ];
  const introLabel = 'text-sm font-bold tracking-[0.04em] text-brand-700';

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

  // 7. 최근에 새로 만들거나 검토한 것
  // 이용자 수 같은 큰 숫자 대신, 등록된 자료에 실제로 적힌 날짜(최초 작성일·검토일)로만 만듭니다.
  // 날짜를 지어내지 않으므로 자료에 날짜가 없으면 목록에 나오지 않습니다.
  const updates = [
    ...checklists.map((checklist) => ({
      key: `checklist-${checklist.id}`,
      type: t.homeUpdates.typeChecklist,
      title: (checklist.i18n[locale] ?? checklist.i18n.ko).title,
      href: `/${locale}/checklists/${checklist.id}`,
      date: checklist.reviewed_at,
      isNew: false,
    })),
    ...getArticles().map((article) => ({
      key: `article-${article.id}`,
      type: t.homeUpdates.typeArticle,
      title: resolveArticle(article, locale).body.title,
      href: `/${locale}/rights/${article.category}/${article.id}`,
      // 최초 작성일이 적혀 있고 그날이 더 최근이면 "새로 추가"로 보여줍니다.
      date: article.created_at && article.created_at > article.reviewed_at ? article.created_at : article.reviewed_at,
      isNew: Boolean(article.created_at && article.created_at >= article.reviewed_at),
    })),
    ...getQnaPosts()
      .filter((post) => post.kind === 'question' && post.answered_at)
      .map((post) => ({
        key: `qna-${post.id}`,
        type: t.homeUpdates.typeQna,
        title: pick(post.title, locale),
        href: `/${locale}/qna/${post.id}`,
        date: post.answered_at as string,
        isNew: true,
      })),
  ]
    .filter((item) => Boolean(item.date))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.key.localeCompare(b.key)))
    .slice(0, 4);

  // 지금 등록된 자료 수 (크게 강조하지 않고 한 줄로만 적습니다)
  const counts = [
    `${t.home.impactArticles} ${getArticles().length}${t.home.impactArticlesUnit}`,
    `${t.home.impactOrganizations} ${getOrganizations().length}${t.home.impactOrganizationsUnit}`,
    `${t.home.impactLanguages} ${LOCALES.length}${t.home.impactLanguagesUnit}`,
    `${t.home.impactParticipants} ${impact.participants.count}${t.home.impactParticipantsUnit} (${formatDate(
      impact.participants.as_of,
      locale,
    )})`,
  ];

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

      {/* 2. 무엇이 궁금한가요?: LINKRIGHTS 흐름 그대로 세 단계 ----------------
          ① 내 상황 알아보기(키워드 검색 / AI 질문) → ② 내 권리 확인하기(권리정보 / 체크리스트) → ③ 필요하면 도움받을 곳 찾기
          검색과 AI 질문은 역할을 나눠 적습니다: 검색 = 이미 아는 낱말로 찾기, AI = 내 상황을 문장으로 설명하기 */}
      <section id="home-start" className="scroll-mt-20 border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-14 sm:py-20">
          <h2 className="lr-h2">{t.homeFind.title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-[17px]">{t.homeFind.subtitle}</p>

          <ol aria-label={t.homeFind.flowLabel} className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-[15px] font-semibold text-ink-700">
            {t.homeFind.flow.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <a href={`#home-step-${index + 1}`} className="flex items-center gap-2 hover:text-brand-700">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[13px] font-bold text-white">
                    {index + 1}
                    <span className="sr-only">.</span>
                  </span>{' '}
                  <span>{step}</span>
                </a>
                {index < t.homeFind.flow.length - 1 && (
                  <Icon name="arrow-right" size={16} className="shrink-0 text-ink-300" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>

          {/* ① 내 상황 알아보기 */}
          <div id="home-step-1" className="mt-10 scroll-mt-24">
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
              <div className="lr-card flex flex-col p-5 sm:p-6">
                <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink-900">
                  <Icon name="sparkles" size={20} className="shrink-0 text-brand-600" /> {t.homeFind.askTitle}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{t.homeFind.askBody}</p>
                <div className="mt-4 flex-1">
                  <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary lr-press">
                    {t.homeFind.askCta} <Icon name="arrow-right" size={18} />
                  </Link>
                </div>
                <p className="mt-4 flex items-start gap-2 border-t border-[var(--color-line)] pt-4 text-sm leading-relaxed text-ink-500">
                  <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-brand-600" /> <span>{t.homeAsk.trust}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ② 내 권리 확인하기 */}
          <div id="home-step-2" className="mt-10 scroll-mt-24">
            <h3 className={stepTitle}>
              <span className={stepNumber}>2</span> {t.homeFind.flow[1]}
            </h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {checkPoints.map((item, index) => (
                <Reveal
                  key={item.key}
                  index={index}
                  className="lr-card lr-card-hover group relative flex items-start gap-4 p-5 sm:p-6"
                >
                  <span className="lr-icon-badge h-12 w-12">
                    <Icon name={item.icon} size={24} />
                  </span>{' '}
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold leading-snug text-ink-900 group-hover:text-brand-800">
                      <Link
                        href={item.href}
                        className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
                      >
                        {item.title}
                      </Link>
                    </span>{' '}
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-500">{item.body}</span>
                  </span>
                  <Icon
                    name="arrow-right"
                    size={20}
                    className="mt-3 shrink-0 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600"
                  />
                </Reveal>
              ))}
            </ul>
          </div>

          {/* ③ 필요하면 도움받을 곳 찾기: 일반 상담(지역 선택)과 긴급 상황을 나눠서 */}
          <div id="home-step-3" className="mt-10 scroll-mt-24">
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

      {/* 3. 나는 누구인가요?: 내 위치에서 시작할 수 있게 위쪽에 둡니다 ------ */}
      <Section tone="soft" title={t.involved.whoTitle} subtitle={t.involved.whoSubtitle}>
        <ul className="grid gap-x-8 gap-y-10 md:grid-cols-3">
          {(
            [
              {
                key: 'youth',
                icon: 'sparkles',
                title: t.involved.youthTitle,
                body: t.involved.youthBody,
                cta: t.involved.youthCta,
                href: `/${locale}/rights`,
                secondary: t.involved.youthSecondary,
                secondaryHref: `/${locale}/ask`,
              },
              {
                key: 'mentor',
                icon: 'book',
                title: t.involved.mentorTitle,
                body: t.involved.mentorBody,
                cta: t.involved.mentorCta,
                href: `mailto:${site.contactEmail}?subject=${encodeURIComponent(t.involved.mentorSubject)}`,
                secondary: t.involved.mentorSecondary,
                secondaryHref: `/${locale}/programs#mentoring`,
              },
              {
                key: 'partner',
                icon: 'briefcase',
                title: t.involved.partnerTitle,
                body: t.involved.partnerBody,
                cta: t.involved.partnerCta,
                href: `mailto:${site.contactEmail}?subject=${encodeURIComponent(t.involved.partnerSubject)}`,
                secondary: t.involved.partnerSecondary,
                secondaryHref: `/${locale}/get-involved`,
              },
            ] as { key: string; icon: IconName; title: string; body: string; cta: string; href: string; secondary: string; secondaryHref: string }[]
          ).map((item, index) => (
            <Reveal key={item.key} index={index} className="flex flex-col border-t-2 border-navy-900 pt-6">
              <span className="lr-icon-badge h-11 w-11">
                <Icon name={item.icon} size={22} />
              </span>{' '}
              <h3 className="lr-h3 mt-4">{item.title}</h3>{' '}
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-500">{item.body}</p>
              <div className="mt-5 flex flex-col items-start gap-2">
                {item.href.startsWith('mailto:') ? (
                  <>
                    <a href={item.href} className="lr-btn lr-btn-primary lr-press">
                      {item.cta} <Icon name="arrow-right" size={18} />
                    </a>
                    <span className="text-[13px] text-ink-500">{t.homeIntro.emailNote}</span>
                  </>
                ) : (
                  <Link href={item.href} className="lr-btn lr-btn-primary lr-press">
                    {item.cta} <Icon name="arrow-right" size={18} />
                  </Link>
                )}
                <Link href={item.secondaryHref} className="lr-link mt-1 text-[15px] font-semibold">
                  {item.secondary}
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 4. LINKRIGHTS 소개: 누가 만들고 운영하는 곳인지까지 -------------- */}
      <section id="home-intro" className="scroll-mt-20 border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="lr-eyebrow">LINKRIGHTS</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[2.5rem]">
                {about.hero_title}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-700">{about.hero_body}</p>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-500">{about.change_body}</p>

              {/* 운영 주체와 함께하는 곳: content/site.json 의 운영 주체, content/partners.json 의 관계 표시를 그대로 씁니다. */}
              <dl className="mt-7 space-y-2 border-t border-[var(--color-line)] pt-5 text-[15px] leading-relaxed">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-bold text-ink-900">{t.footerNav.operatorLabel}</dt>
                  <dd className="text-ink-700">{pick(site.operator, locale)}</dd>
                </div>
                {partners.length > 0 && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-bold text-ink-900">{t.homeIntro.partnerLabel}</dt>
                    <dd className="text-ink-700">
                      {partners.map((partner) => `${pick(partner.name, locale)} (${pick(partner.relation, locale)})`).join(' · ')}
                    </dd>
                  </div>
                )}
              </dl>

              <Link
                href={`/${locale}/about`}
                className="lr-link mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold"
              >
                {t.nav.about} <Icon name="arrow-right" size={16} />
              </Link>
            </div>

            <div className="space-y-12 lg:col-span-7">
              {/* 누구를 위한 곳인가요? */}
              <div>
                <h3 className={introLabel}>{t.homeIntro.whoLabel}</h3>
                <p className="mt-3 text-xl font-semibold leading-relaxed text-ink-900 sm:text-2xl">{t.homeIntro.whoBody}</p>
              </div>

              {/* 어떤 도움을 주나요? */}
              <div>
                <h3 className={introLabel}>{t.homeIntro.helpLabel}</h3>
                <ol className="mt-3 border-t-2 border-navy-900">
                  {helpSteps.map((step, index) => (
                    <Reveal
                      key={step.title}
                      index={index}
                      className="grid grid-cols-[3rem_1fr] gap-4 border-b border-[var(--color-line)] py-5 sm:grid-cols-[4.5rem_1fr] sm:py-6"
                    >
                      <span className="text-2xl font-extrabold tabular-nums text-brand-600 sm:text-3xl">
                        {String(index + 1).padStart(2, '0')}
                        <span className="sr-only">.</span>
                      </span>{' '}
                      <div>
                        <h4 className="text-lg font-bold text-ink-900 sm:text-xl">{step.title}</h4>{' '}
                        <p className="mt-1 text-[16px] leading-relaxed text-ink-500">{step.body}</p>
                      </div>
                    </Reveal>
                  ))}
                </ol>
              </div>

              {/* 어떻게 쓰나요? */}
              <div>
                <h3 className={introLabel}>{t.homeIntro.howLabel}</h3>
                <ol className="mt-4 grid gap-6 sm:grid-cols-3 sm:gap-5">
                  {howSteps.map((step, index) => (
                    <li key={step.href} className="flex flex-col border-t border-[var(--color-line)] pt-4">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
                        {index + 1}
                        <span className="sr-only">.</span>
                      </span>{' '}
                      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-700">{step.body}</p>
                      <Link
                        href={step.href}
                        className="lr-link mt-3 inline-flex items-center gap-1 text-[15px] font-semibold"
                      >
                        {step.label} <Icon name="arrow-right" size={16} />
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 어떤 상황에 있나요?: 분야를 큰 글씨 목록으로 ----------------- */}
      <Section title={t.homeBrand.situationTitle} subtitle={t.home.browseSubtitle}>
        <ul className="grid border-t border-[var(--color-line)] sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id} className="border-b border-[var(--color-line)]">
              <Link
                href={category.kind === 'directory' ? `/${locale}/organizations` : `/${locale}/rights/${category.id}`}
                className="group flex items-center gap-4 py-5"
              >
                <Icon name={category.icon as IconName} size={24} className="shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-ink-900 group-hover:text-brand-700">
                    {pick(category.name, locale)}
                  </span>{' '}
                  <span className="mt-0.5 block text-[15px] leading-snug text-ink-500">{pick(category.tagline, locale)}</span>
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

      </Section>

      {/* 6. 내 상황을 말해 보세요: 무엇을 얻을 수 있는지 함께 보여줍니다 (AI는 권리를 알아가는 도구) */}
      <Section tone="soft" title={t.homeBrand.askTitle} subtitle={t.homeAsk.subtitle}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-surface-soft p-5 sm:p-7">
              <AskBox locale={locale} examples={examples} />
            </div>
          </div>
          <div className="lg:col-span-5">
            <h3 className="text-lg font-bold text-ink-900">{t.homeAsk.getsTitle}</h3>
            <ol className="mt-4 border-t border-[var(--color-line)]">
              {t.homeAsk.gets.map((item, index) => (
                <li
                  key={item.title}
                  className={`flex gap-3 border-b border-[var(--color-line)] py-3.5 ${
                    index === 3 ? '-mx-3 rounded-[var(--radius-control)] bg-brand-50 px-3' : ''
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[13px] font-bold text-white">
                    {index + 1}
                    <span className="sr-only">.</span>
                  </span>{' '}
                  <span className="min-w-0">
                    <span className="block font-bold text-ink-900">{item.title}</span>{' '}
                    <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-500">{item.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-ink-500">
              <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-brand-600" /> <span>{t.homeAsk.trust}</span>
            </p>
          </div>
        </div>
      </Section>

      {/* 7. 최근에 새로 만들거나 검토한 것 ------------------------------
          큰 숫자로 규모를 보여주는 대신, 등록 자료의 실제 날짜로 "지금도 손보고 있다"를 보여줍니다. */}
      {updates.length > 0 && (
        <section aria-labelledby="updates-title" className="bg-navy-900 text-white">
          <div className="lr-container py-14 sm:py-16">
            <h2 id="updates-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t.homeUpdates.title}
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/75 sm:text-base">
              {t.homeUpdates.subtitle}
            </p>

            <ul className="mt-9 grid gap-x-8 sm:grid-cols-2">
              {updates.map((item) => (
                <li key={item.key} className="border-t border-white/20 py-5">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold">
                    <span className="border-l-2 border-sun-400 pl-2 text-white/85">{item.type}</span>
                    <span className="text-white/60">
                      {item.isNew ? t.homeUpdates.createdLabel : t.homeUpdates.reviewedLabel}{' '}
                      {formatDate(item.date, locale)}
                    </span>
                  </p>
                  <p className="mt-2">
                    <Link href={item.href} className="text-lg font-bold leading-snug text-white hover:underline">
                      {item.title}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>

            {/* 지금 등록된 자료 수: 크게 강조하지 않고 한 줄로만 적습니다. */}
            <p className="mt-8 text-[13px] leading-relaxed text-white/60">
              <span className="font-semibold text-white/75">{t.homeUpdates.countsLabel}</span> · {counts.join(' · ')}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">{t.homeUpdates.note}</p>
          </div>
        </section>
      )}

      {/* 7-1. 실제 참여자 후기: content/testimonials.json 에 공개 동의를 받아 등록한 후기가 있을 때만 */}
      <Testimonials items={getTestimonials()} t={t} locale={locale} />

      {/* 8. 많이 찾는 권리정보 -------------------------------------- */}
      <Section title={t.home.featuredTitle} subtitle={t.home.featuredSubtitle} action={viewAll(`/${locale}/rights`)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((article, index) => (
            <Reveal key={article.id} index={index}>
              <ArticleCard article={article} locale={locale} />
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 9. 체크해보기: 상황별 체크리스트 (content/checklists) ---------- */}
      {checklists.length > 0 && (
        <Section
          tone="soft"
          title={t.checklist.homeTitle}
          subtitle={t.checklist.homeSubtitle}
          action={viewAll(`/${locale}/checklists`)}
        >
          <ul className="grid gap-4 md:grid-cols-2">
            {checklists.map((checklist, index) => {
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

      {/* 10. 실제 도움을 받을 수 있는 곳 ----------------------------- */}
      <Section title={t.home.orgTitle} subtitle={t.home.orgSubtitle} action={viewAll(`/${locale}/organizations`)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org, index) => (
            <Reveal key={org.id} index={index}>
              <OrgCard org={org} locale={locale} />
            </Reveal>
          ))}
        </ul>
        <Link
          href={`/${locale}/organizations`}
          className="lr-link mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold"
        >
          <Icon name="search" size={16} /> {t.orgFinder.searchLabel}
        </Link>
      </Section>

      {/* 11. 자주 묻는 질문 + 질문 게시판 ----------------------------- */}
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
