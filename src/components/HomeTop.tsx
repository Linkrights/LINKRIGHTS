// 홈 첫 화면입니다. 네 가지 언어 모두 같은 모습입니다.
//
//   제목(정보를 잇다. 권리를 잇다.) → 넓은 배너 → 질문 칸 → 긴급 연락처
//
// 배너만 언어에 따라 만드는 방법이 다릅니다.
//   한국어: 팀에서 만든 사진을 통째로 씁니다. 제목·검색창·추천 검색어가 사진에 **그려져** 있어서,
//           그 위에 진짜 입력칸만 정확히 포갭니다.
//   그 밖:  사진에 그려진 글자가 한국어라 쓸 수 없습니다. 그래서 사람과 도시만 오른쪽에 붙이고
//           제목·안내문·검색창·추천 검색어는 그 언어 글자로 그립니다. (모습은 한국어와 같게 맞췄습니다)
//
// 좁은 화면에서는 두 경우 모두 배너 대신 사람 그림만 보여 주고 글자는 아래에 둡니다.
// 배너는 가로로 긴 모양이라, 좁은 화면에서는 글씨가 읽을 수 없을 만큼 작아지기 때문입니다.
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
  /** 넓은 화면에 깔 배너. 언어에 따라 만드는 방법이 달라 page.tsx 에서 골라 넘깁니다. */
  banner: ReactNode;
  /** 질문 칸 (AskBox) */
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="home-hero-title" className="lr-hero">
      <div className="lr-container py-10 sm:py-12 lg:py-14">
        <p className="lr-eyebrow text-brand-700">{labels.eyebrow}</p>
        <h1 id="home-hero-title" className="lr-display mt-3 whitespace-pre-line text-ink-900">
          {labels.title}
        </h1>

        {/* 넓은 화면: 배너 */}
        <div className="mt-7 hidden lg:block">{banner}</div>

        {/* 좁은 화면: 배너는 가로로 길어 글씨가 너무 작아지므로, 사람 그림만 보여 주고 설명은 글자로 */}
        <div className="mt-6 lg:hidden">
          <HeroPicture variant="crop" className="mx-auto w-full max-w-[18rem]" priority />
          <p className="lr-lead mt-6">{labels.subtitle}</p>
        </div>

        {/* 질문 칸: 첫 화면에서 바로 시작할 수 있게 */}
        <div className="mt-7">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-4 shadow-[0_12px_32px_rgba(14,37,79,0.08)] sm:p-5">
            {children}
          </div>
        </div>
        <QuickLinks locale={locale} labels={labels} contacts={contacts} />
      </div>
    </section>
  );
}
