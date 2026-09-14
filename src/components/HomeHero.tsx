'use client';

// 홈 첫 화면입니다. LINKRIGHTS 소개 영상(팀이 제작한 홍보 영상의 도입부)을 화면 전체 배경으로 쓰고,
// 짙은 네이비 오버레이 위에 핵심 문구와 버튼을 보여줍니다.
//
// - 대표 이미지(poster)를 먼저 보여주고, 페이지 로딩이 끝난 뒤에만 영상을 불러옵니다.
//   (글자와 버튼은 서버에서 그리므로 영상이 늦거나 실패해도 첫 화면은 그대로 보입니다)
// - 움직임 줄이기 설정, 데이터 절약 모드, 느린 네트워크(2G)에서는 영상을 자동으로 재생하지 않고 대표 이미지만 보여줍니다.
//   이때도 재생 버튼을 누르면 영상을 볼 수 있습니다.
// - 영상은 소리 없이 반복되며, 멈춤 버튼으로 언제든 멈출 수 있습니다. 화면에서 벗어나면 잠시 멈춥니다.
// - "소개 영상 전체 보기"는 소리가 있는 전체 영상을 대화상자에서 재생합니다.

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
  video: {
    label: string;
    play: string;
    pause: string;
    playFull: string;
    duration: string;
    close: string;
    note: string;
  };
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

export function HomeHero({
  labels,
  rightsHref,
  askHref,
  emergencyHref,
  contacts,
  loopSrc,
  fullSrc,
  poster,
}: {
  labels: HomeHeroLabels;
  rightsHref: string;
  askHref: string;
  emergencyHref: string;
  /** 등록된 긴급 기관 (112·119) */
  contacts: { id: string; name: string; phone: string }[];
  /** 배경 반복 영상. 파일이 없으면 비워 두며, 이때는 대표 이미지만 보여줍니다. */
  loopSrc?: string;
  /** 소리 있는 전체 영상. 파일이 없으면 "전체 보기" 버튼을 숨깁니다. */
  fullSrc?: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const userPaused = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // 자동 재생 여부: 움직임 줄이기·데이터 절약·느린 네트워크가 아니면, 페이지 로딩이 끝난 뒤 영상을 불러옵니다.
  useEffect(() => {
    if (!loopSrc) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    const slow =
      connection?.saveData === true || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
    if (reduce || slow) return;
    const start = () => setEnabled(true);
    if (document.readyState === 'complete') {
      const timer = window.setTimeout(start, 200);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, [loopSrc]);

  // 화면에서 벗어나면 멈추고, 다시 보이면 이어서 재생합니다. (사용자가 직접 멈춘 경우는 그대로 둡니다)
  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video || typeof IntersectionObserver === 'undefined') return;
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
  }, [enabled]);

  // 전체 영상 대화상자가 어떤 방법으로 닫혀도 소리가 계속 나지 않도록 멈춥니다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const pauseIfClosed = () => {
      if (!dialog.open) fullRef.current?.pause();
    };
    dialog.addEventListener('close', pauseIfClosed);
    const observer = new MutationObserver(pauseIfClosed);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    return () => {
      dialog.removeEventListener('close', pauseIfClosed);
      observer.disconnect();
    };
  }, []);

  function toggleLoop() {
    userPaused.current = false;
    if (!enabled) {
      // 자동 재생을 하지 않은 환경에서도 사용자가 원하면 재생합니다.
      setEnabled(true);
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

  function openFull() {
    userPaused.current = true;
    videoRef.current?.pause();
    dialogRef.current?.showModal();
    fullRef.current?.play().catch(() => {
      // 브라우저가 자동 재생을 막으면 사용자가 재생 버튼을 누르면 됩니다.
    });
  }

  function closeFull() {
    fullRef.current?.pause();
    dialogRef.current?.close();
  }

  return (
    <>
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
            height={736}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        )}
        {enabled && loopSrc && !failed && (
          <video
            ref={videoRef}
            src={loopSrc}
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
        {/* 글자가 영상에 묻히지 않도록: 왼쪽(글자 쪽)을 더 짙게, 아래쪽도 짙게 */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(7,15,34,0.86)_0%,rgba(7,15,34,0.68)_48%,rgba(7,15,34,0.42)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[linear-gradient(to_top,rgba(7,15,34,0.92),rgba(7,15,34,0))]"
        />

        <div className="lr-container flex flex-1 flex-col justify-center pb-10 pt-32 sm:pt-40">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/75 sm:text-sm">
            LINKRIGHTS · {labels.eyebrow}
          </p>
          <h1
            id="home-hero-title"
            className="mt-5 max-w-4xl whitespace-pre-line text-[2.2rem] font-extrabold leading-[1.18] tracking-tight sm:text-5xl lg:text-[3.75rem]"
          >
            {labels.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">{labels.subtitle}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={rightsHref} className="lr-btn lr-btn-lg lr-press bg-white text-[#0b1730] hover:bg-brand-50">
              {labels.ctaRights} <Icon name="arrow-right" size={18} />
            </Link>
            <Link
              href={askHref}
              className="lr-btn lr-btn-lg lr-press border border-white/55 bg-transparent text-white hover:bg-white/10"
            >
              {labels.ctaAsk}
            </Link>
          </div>
        </div>

        {/* 아래쪽 줄: 긴급 연락처 · 소개 영상 · 멈춤 · 아래로 */}
        <div className="lr-container pb-6 sm:pb-8">
          <div className="flex flex-col gap-4 border-t border-white/15 pt-5 md:flex-row md:items-center md:justify-between">
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
                  className="rounded-full border border-white/35 px-3 py-1 font-bold text-white transition-colors hover:bg-white/10"
                >
                  {contact.phone}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {fullSrc && (
                <button
                  type="button"
                  onClick={openFull}
                  className="lr-btn lr-btn-sm lr-press border border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <PlayGlyph /> {labels.video.playFull}{' '}
                  <span className="font-normal text-white/60">{labels.video.duration}</span>
                </button>
              )}
              {loopSrc && !failed && (
                <button
                  type="button"
                  onClick={toggleLoop}
                  aria-label={playing ? labels.video.pause : labels.video.play}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
                >
                  {playing ? <PauseGlyph /> : <PlayGlyph />}
                </button>
              )}
              <a
                href="#home-intro"
                aria-label={labels.scrollDown}
                className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10 sm:grid"
              >
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {fullSrc && (
        <dialog
          ref={dialogRef}
          aria-label={labels.video.label}
          className="m-auto w-[min(960px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] bg-white p-0 backdrop:bg-black/75"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
            <p className="font-bold text-ink-900">{labels.video.label}</p>
            <button type="button" onClick={closeFull} className="lr-btn lr-btn-ghost lr-btn-sm">
              {labels.video.close}
            </button>
          </div>
          <video
            ref={fullRef}
            src={fullSrc}
            poster={poster}
            controls
            playsInline
            preload="none"
            className="block aspect-[1280/736] w-full bg-black"
          />
          <p className="px-4 py-3 text-sm leading-relaxed text-ink-500">{labels.video.note}</p>
        </dialog>
      )}
    </>
  );
}
