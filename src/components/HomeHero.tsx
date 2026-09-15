'use client';

// 홈 첫 화면입니다. 팀이 만든 LINKRIGHTS 소개 영상 "전체"(처음부터 끝까지)를 화면 전체 배경으로 쓰고,
// 영상이 끝나면 다시 처음부터 전체를 반복합니다. (짧게 잘라 만든 반복 영상이나 별도의 영상 보기 창은 쓰지 않습니다)
//
// - 대표 이미지(영상 0초 장면)를 먼저 보여주고, 페이지 로딩이 끝난 뒤에 화면 폭에 맞는 영상 파일 하나만 불러옵니다.
//   (휴대폰: 480p 파일, 태블릿·데스크톱: 720p 파일 / 글자와 버튼은 서버에서 그리므로 영상이 늦거나 실패해도 그대로 보입니다)
// - 움직임 줄이기 설정, 데이터 절약 모드, 느린 네트워크(2G)에서는 자동 재생하지 않고 대표 이미지만 보여줍니다.
//   이때도 재생 버튼을 누르면 영상을 볼 수 있습니다.
// - 5초 넘게 움직이는 화면은 멈출 수 있어야 하므로(접근성) 작은 멈춤 버튼만 둡니다. 화면에서 벗어나면 잠시 멈춥니다.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface HomeHeroLabels {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaRights: string;
  ctaAsk: string;
  emergency: string;
  call: string;
  scrollDown: string;
  play: string;
  pause: string;
}

export interface HeroVideoSources {
  /** 태블릿·데스크톱용 전체 영상 */
  desktop: string;
  /** 휴대폰(768px 미만)용 전체 영상. 없으면 desktop 파일을 씁니다. */
  mobile?: string;
}

function PlayGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
    </svg>
  );
}

function chooseSource(sources: HeroVideoSources): string {
  return sources.mobile && window.matchMedia('(max-width: 767px)').matches ? sources.mobile : sources.desktop;
}

export function HomeHero({
  labels,
  rightsHref,
  askHref,
  emergencyHref,
  contacts,
  sources,
  poster,
}: {
  labels: HomeHeroLabels;
  rightsHref: string;
  askHref: string;
  emergencyHref: string;
  /** 등록된 긴급 기관 (112·119) */
  contacts: { id: string; name: string; phone: string }[];
  /** 영상 파일이 없으면 비워 두며, 이때는 대표 이미지 또는 네이비 배경만 보여줍니다. */
  sources?: HeroVideoSources;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // 자동 재생 여부: 움직임 줄이기·데이터 절약·느린 네트워크가 아니면, 페이지 로딩이 끝난 뒤 영상을 불러옵니다.
  useEffect(() => {
    if (!sources) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    const slow =
      connection?.saveData === true || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
    if (reduce || slow) return;
    const start = () => setSrc(chooseSource(sources));
    if (document.readyState === 'complete') {
      const timer = window.setTimeout(start, 200);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, [sources]);

  // 화면에서 벗어나면 멈추고, 다시 보이면 이어서 재생합니다. (사용자가 직접 멈춘 경우는 그대로 둡니다)
  useEffect(() => {
    const video = videoRef.current;
    if (!src || !video || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (userPaused.current) return;
        if (entry.isIntersecting) video.play().catch(() => setPlaying(false));
        else video.pause();
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  function toggle() {
    if (!sources) return;
    userPaused.current = false;
    if (!src) {
      // 자동 재생을 하지 않은 환경에서도 사용자가 원하면 재생합니다.
      setSrc(chooseSource(sources));
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setFailed(true));
    } else {
      userPaused.current = true;
      video.pause();
    }
  }

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate -mt-[65px] flex min-h-[max(600px,100svh)] flex-col overflow-hidden bg-[#0b1730] text-white sm:-mt-[73px]"
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
      )}
      {src && !failed && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => {
            setReady(true);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-700 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      {/* 영상이 잘 보이도록 오버레이는 약하게: 글자가 놓이는 왼쪽 아래와 헤더가 놓이는 위쪽만 짙게 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,15,34,0.72)_0%,rgba(7,15,34,0.4)_45%,rgba(7,15,34,0.08)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-[linear-gradient(to_top,rgba(7,15,34,0.88),rgba(7,15,34,0))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(to_bottom,rgba(7,15,34,0.55),rgba(7,15,34,0))]"
      />

      <div className="lr-container flex flex-1 flex-col justify-end pb-8 pt-28 sm:pb-10">
        <p className="text-[13px] font-semibold tracking-[0.08em] text-white/80 sm:text-sm">
          LINKRIGHTS · {labels.eyebrow}
        </p>
        <h1
          id="home-hero-title"
          className="mt-4 max-w-3xl whitespace-pre-line text-[2.1rem] font-extrabold leading-[1.2] tracking-tight [text-shadow:0_1px_12px_rgba(7,15,34,0.45)] sm:text-5xl lg:text-[3.5rem]"
        >
          {labels.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl">{labels.subtitle}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={rightsHref} className="lr-btn lr-btn-lg lr-press bg-white text-[#0b1730] hover:bg-brand-50">
            {labels.ctaRights} <Icon name="arrow-right" size={18} />
          </Link>
          <Link
            href={askHref}
            className="lr-btn lr-btn-lg lr-press border border-white/70 bg-[rgba(7,15,34,0.25)] text-white hover:bg-white/10"
          >
            {labels.ctaAsk}
          </Link>
        </div>
      </div>

      {/* 아래쪽 줄: 긴급 연락처 · 영상 멈춤 · 아래로 */}
      <div className="lr-container pb-6 sm:pb-8">
        <div className="flex flex-col gap-4 border-t border-white/20 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Link
              href={emergencyHref}
              className="inline-flex items-start gap-2 font-semibold leading-snug text-white/90 hover:underline"
            >
              <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-[#ff8a80]" /> <span>{labels.emergency}</span>
            </Link>
            {contacts.map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                aria-label={`${contact.name} ${labels.call}`}
                className="inline-flex min-h-9 items-center rounded-full border border-white/40 px-3.5 font-bold text-white transition-colors hover:bg-white/10"
              >
                {contact.phone}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {sources && !failed && (
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? labels.pause : labels.play}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10"
              >
                {playing ? <PauseGlyph /> : <PlayGlyph />}
              </button>
            )}
            <a
              href="#home-intro"
              aria-label={labels.scrollDown}
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 sm:grid"
            >
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
