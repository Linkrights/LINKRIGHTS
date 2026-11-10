// 홈 첫 화면입니다. 네 가지 언어 모두 같은 모습입니다.
//
//   배경 영상 위에 → 제목(정보를 잇다. 권리를 잇다.) → 한 줄 설명 → 검색창 → 긴급 연락처
//
// 예전에는 팀에서 만든 사진 배너를 크게 깔았는데, 배경 영상이 들어오면서 그림이 두 겹이 되었습니다.
// 그래서 사진 배너를 걷어 내고 영상만 남겼습니다.
// 사진에 그려져 있던 제목·검색창·추천 검색어 가운데, 제목과 검색창은 이제 글자와 진짜 입력칸으로 둡니다.
// (HeroBannerSearch·HeroBannerText·HeroPicture 는 지우지 않고 남겨 두었습니다. 다시 쓸 일이 생기면 그대로 씁니다)
//
// 영상이 깔리면 뒤가 어두워지므로 글자는 흰색으로 바꿉니다.
// 글과 칸은 서버에서 그리므로 자바스크립트가 늦거나 막혀도 그대로 보입니다.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { HeroVideoBackdrop, type HeroVideoLabels, type HeroVideoSources } from './art/HeroVideoBackdrop';
import { Icon } from './Icon';

interface HomeTopLabels {
  eyebrow: string;
  title: string;
  subtitle: string;
  emergency: string;
  call: string;
  rights: string;
}

/** 긴급 연락처와 권리정보 바로가기 — 두 모습 모두 아래쪽에 같은 모양으로 둡니다.
 *
 *  영상이 깔리면 뒤가 어두워지므로 글자를 흰색으로 바꿉니다.
 *  원래 쓰던 파란색·빨간색은 어두운 영상 위에서 거의 읽히지 않았습니다.
 *  (112·119 알약은 흰 바탕이라 그대로 두어도 또렷합니다) */
function QuickLinks({
  locale,
  labels,
  contacts,
  onVideo,
}: {
  locale: string;
  labels: HomeTopLabels;
  contacts: { id: string; name: string; phone: string }[];
  onVideo: boolean;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link
        href={`/${locale}/rights`}
        className={`inline-flex items-center gap-1.5 text-[15px] font-bold ${
          onVideo ? 'text-white hover:underline' : 'lr-link'
        }`}
      >
        {labels.rights} <Icon name="arrow-right" size={16} />
      </Link>
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/${locale}/emergency`}
          className={`inline-flex items-center gap-1.5 font-semibold hover:underline ${
            onVideo ? 'text-white' : 'text-[var(--color-danger-700)]'
          }`}
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
  video,
  children,
}: {
  locale: string;
  labels: HomeTopLabels;
  /** 등록된 긴급 기관 (112·119) */
  contacts: { id: string; name: string; phone: string }[];
  /**
   * 배너 **뒤**에 깔 배경 영상. public 에 파일이 있을 때만 넘어옵니다.
   * 영상이 있으면 뒤가 어두워지므로 제목과 설명을 흰 글자로 바꿉니다.
   */
  video?: { sources: HeroVideoSources; poster?: string; labels: HeroVideoLabels };
  /** 검색창 (AskBox) */
  children: ReactNode;
}) {
  const onVideo = Boolean(video);
  return (
    <section aria-labelledby="home-hero-title" className={`lr-hero ${onVideo ? 'lr-hero-video' : ''}`}>
      {video && <HeroVideoBackdrop sources={video.sources} poster={video.poster} labels={video.labels} />}
      <div className="lr-container relative py-12 sm:py-16 lg:py-24">
        <p className={`lr-eyebrow ${onVideo ? 'text-white/85' : 'text-brand-700'}`}>{labels.eyebrow}</p>
        <h1
          id="home-hero-title"
          className={`lr-display mt-3 whitespace-pre-line ${onVideo ? 'text-white [text-shadow:0_2px_14px_rgba(8,26,56,0.5)]' : 'text-ink-900'}`}
        >
          {labels.title}
        </h1>

        <p className={`lr-lead mt-6 max-w-2xl ${onVideo ? 'text-white/90' : ''}`}>{labels.subtitle}</p>

        {/* 검색창 하나만 둡니다. 하얀 카드로 감싸지 않습니다 — 안에 검색창뿐이라 자리만 먹었습니다. */}
        <div className="mt-7 max-w-2xl">{children}</div>
        <QuickLinks locale={locale} labels={labels} contacts={contacts} onVideo={onVideo} />
      </div>
    </section>
  );
}
