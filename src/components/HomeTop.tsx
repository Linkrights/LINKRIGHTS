// 홈 첫 화면입니다. (밝은 바탕 · 큰 질문 칸 중심)
//
// 예전에는 소개 영상을 어두운 배경으로 꽉 채웠는데,
//   "들어오자마자 무엇을 할 수 있는지"가 먼저 보이도록 밝은 바탕 + 큰 질문 칸으로 바꿨습니다.
//   소개 영상은 아래쪽 "LINKRIGHTS가 만들어가는 더 나은 내일" 구역에서 계속 보여줍니다.
//
// 글과 칸은 서버에서 그리므로 자바스크립트가 늦거나 막혀도 그대로 보입니다.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { PeopleArt } from './art/PeopleArt';
import { Icon } from './Icon';

export function HomeTop({
  locale,
  labels,
  contacts,
  children,
}: {
  locale: string;
  labels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    emergency: string;
    call: string;
    rights: string;
  };
  /** 등록된 긴급 기관 (112·119) */
  contacts: { id: string; name: string; phone: string }[];
  /** 질문 칸 (AskBox) */
  children: ReactNode;
}) {
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
            <div className="mt-7 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-4 shadow-[0_12px_32px_rgba(14,37,79,0.08)] sm:p-5">
              {children}
            </div>

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
          </div>

          {/* 오른쪽 그림: 글을 읽지 않아도 "누구를 위한 곳인지" 느낌이 오도록 (장식이라 화면낭독기에서는 읽지 않습니다) */}
          <div className="hidden lg:block">
            <PeopleArt className="mx-auto h-auto w-full max-w-md" />
          </div>
        </div>
      </div>
    </section>
  );
}
