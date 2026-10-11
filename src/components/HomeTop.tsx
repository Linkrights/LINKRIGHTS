// 홈 첫 화면입니다.
//
// 두 가지 모습이 있습니다.
//   banner 를 받으면 (한국어): 팀에서 만든 사진을 넓은 화면에 통째로 크게 깔고, 그 아래 질문 칸을 둡니다.
//     사진 안에 제목·검색창·추천 검색어가 **그려져** 있어, 화면 글자와 겹치지 않도록 설명문은 숨깁니다.
//     좁은 화면에서는 그려진 글씨가 읽을 수 없을 만큼 작아지므로, 사람 쪽만 잘라 보여 주고 글자는 화면에서 그립니다.
//   banner 가 없으면 (영어·중국어·베트남어): 왼쪽 글자 + 오른쪽 그림의 2단 구성입니다.
//     그림은 같은 사진에서 한국어 글자가 없는 오른쪽(사람 + 도시)만 잘라 씁니다.
//
// 글과 칸은 서버에서 그리므로 자바스크립트가 늦거나 막혀도 그대로 보입니다.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { HeroPicture } from './art/HeroPicture';
import { Icon } from './Icon';

interface HomeTopLabels {
  eyebrow: string;
  title: string;
  subtitle: string;
  emergency: string;
  call: string;
  rights: string;
}

/** 긴급 연락처와 권리정보 바로가기 — 두 모습 모두 아래쪽에 같은 모양으로 둡니다 */
function QuickLinks({
  locale,
  labels,
  contacts,
}: {
  locale: string;
  labels: HomeTopLabels;
  contacts: { id: string; name: string; phone: string }[];
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link href={`/${locale}/rights`} className="lr-link inline-flex items-center gap-1.5 text-[15px] font-bold">
        {labels.rights} <Icon name="arrow-right" size={16} />
      </Link>
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/${locale}/emergency`}
          className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-danger-700)] hover:underline"
        >
          <Icon name="alert" size={15} className="shrink-0" /> {labels.emergency}
        </Link>
        {contacts.map((contact) => (
          <a
            key={contact.id}
            href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
            aria-label={`${contact.name} ${labels.call}`}
            className="inline-flex min-h-8 items-center rounded-full border border-[var(--color-danger-200)] bg-white px-3 font-bold text-[var(--color-danger-700)] transition-colors hover:border-[var(--color-danger-600)]"
          >
            {contact.phone}
          </a>
        ))}
      </span>
    </div>
  );
}

export function HomeTop({
  locale,
  labels,
  contacts,
  banner,
  children,
}: {
  locale: string;
  labels: HomeTopLabels;
  /** 등록된 긴급 기관 (112·119) */
  contacts: { id: string; name: string; phone: string }[];
  /** 사진 배너 위에 얹을 진짜 검색창 (한국어 화면에서만) */
  banner?: ReactNode;
  /** 질문 칸 (AskBox) */
  children: ReactNode;
}) {
  const askCard = (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-4 shadow-[0_12px_32px_rgba(14,37,79,0.08)] sm:p-5">
      {children}
    </div>
  );

  if (banner) {
    return (
      <section aria-labelledby="home-hero-title" className="lr-hero">
        <div className="lr-container py-10 sm:py-12 lg:py-14">
          <p className="lr-eyebrow text-brand-700">{labels.eyebrow}</p>
          <h1 id="home-hero-title" className="lr-display mt-3 whitespace-pre-line text-ink-900">
            {labels.title}
          </h1>

          {/* 넓은 화면: 사진 전체 + 그려진 검색창 위에 포갠 진짜 검색창 */}
          <div className="relative mt-7 hidden lg:block">
            <HeroPicture variant="full" priority />
            {banner}
          </div>

          {/* 좁은 화면: 그려진 글씨가 너무 작아지므로 사람 쪽만 잘라 보여 주고 설명은 글자로 */}
          <div className="mt-6 lg:hidden">
            <HeroPicture variant="crop" className="mx-auto w-full max-w-[18rem]" priority />
            <p className="lr-lead mt-6">{labels.subtitle}</p>
          </div>

          <div className="mt-7">{askCard}</div>
          <QuickLinks locale={locale} labels={labels} contacts={contacts} />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="home-hero-title" className="lr-hero">
      <div className="lr-container py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div className="min-w-0">
            <p className="lr-eyebrow text-brand-700">{labels.eyebrow}</p>
            <h1 id="home-hero-title" className="lr-display mt-3 whitespace-pre-line text-ink-900">
              {labels.title}
            </h1>
            <p className="lr-lead mt-4 max-w-xl">{labels.subtitle}</p>

            {/* 질문 칸: 첫 화면에서 바로 시작할 수 있게 */}
            <div className="mt-7">{askCard}</div>
            <QuickLinks locale={locale} labels={labels} contacts={contacts} />
          </div>

          {/* 오른쪽 그림: 글을 읽지 않아도 "누구를 위한 곳인지" 느낌이 오도록 (장식이라 화면낭독기에서는 읽지 않습니다) */}
          <div className="hidden lg:block">
            <HeroPicture variant="crop" className="mx-auto w-full max-w-sm" priority />
          </div>
        </div>
      </div>
    </section>
  );
}
