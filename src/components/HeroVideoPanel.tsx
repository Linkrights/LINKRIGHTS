'use client';

// 홈 첫 화면의 소개 영상 패널입니다. (영상: 팀이 제작한 LINKRIGHTS 홍보 영상)
//
// - 짧은 반복 영상(소리 없음)은 넓은 화면(768px 이상)에서, 움직임 줄이기·데이터 절약 설정이 꺼져 있을 때만,
//   화면에 보이는 동안 자동으로 재생합니다. 멈춤/재생 버튼으로 언제든 멈출 수 있습니다.
// - 휴대폰이나 움직임 줄이기 설정에서는 대표 이미지(poster)만 보이고, 재생 버튼을 누르면 재생됩니다.
// - "전체 영상 보기"를 누르면 소리가 있는 전체 영상을 대화상자에서 재생합니다. (전체 영상 파일이 있을 때만)
// - 영상을 불러오지 못하면 대표 이미지만 보여줍니다.

import { useEffect, useRef, useState } from 'react';

export interface HeroVideoLabels {
  label: string;
  caption: string;
  play: string;
  pause: string;
  playFull: string;
  duration: string;
  close: string;
  note: string;
}

function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
    </svg>
  );
}

export function HeroVideoPanel({
  loopSrc,
  fullSrc,
  poster,
  labels,
}: {
  loopSrc: string;
  /** 전체 영상 주소. 파일이 없으면 비워 두며, 이때 "전체 영상 보기" 버튼을 숨깁니다. */
  fullSrc?: string;
  poster: string;
  labels: HeroVideoLabels;
}) {
  const loopRef = useRef<HTMLVideoElement>(null);
  const fullRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // 자동 재생: 넓은 화면 + 움직임 줄이기 꺼짐 + 데이터 절약 꺼짐일 때, 화면에 보이는 동안만
  useEffect(() => {
    const video = loopRef.current;
    if (!video) return;
    const wide = window.matchMedia('(min-width: 768px)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (!wide || reduce || saveData || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (userPaused.current) return;
        if (entry.isIntersecting) video.play().catch(() => setPlaying(false));
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // 전체 영상 대화상자가 어떤 방법으로 닫혀도(닫기 버튼, Esc 키 등) 소리가 계속 나지 않도록 영상을 멈춥니다.
  // close 이벤트가 늦거나 오지 않는 환경도 있어, 대화상자의 open 속성이 사라지는 것도 함께 확인합니다.
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

  function closeFull() {
    fullRef.current?.pause();
    dialogRef.current?.close();
  }

  function toggleLoop() {
    const video = loopRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => setFailed(true));
    } else {
      userPaused.current = true;
      video.pause();
    }
  }

  function openFull() {
    userPaused.current = true;
    loopRef.current?.pause();
    dialogRef.current?.showModal();
    fullRef.current?.play().catch(() => {
      // 브라우저가 자동 재생을 막으면 사용자가 재생 버튼을 누르면 됩니다.
    });
  }

  return (
    <>
      <figure className="relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-ink-900 shadow-[var(--shadow-raised)]">
        <div className="relative aspect-[1280/736]">
          {/* 대표 이미지: 영상이 재생되기 전, 재생하지 않는 환경, 영상 오류일 때 보입니다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            width={1280}
            height={736}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!failed && (
            <video
              ref={loopRef}
              src={loopSrc}
              poster={poster}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              tabIndex={-1}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* 글자가 잘 읽히도록 아래쪽을 어둡게 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-3/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent sm:block" />

          {!failed && (
            <button
              type="button"
              onClick={toggleLoop}
              aria-label={playing ? labels.pause : labels.play}
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {playing ? <PauseGlyph /> : <PlayGlyph />}
            </button>
          )}

        </div>

        {/* 설명: 휴대폰에서는 영상 아래에, 넓은 화면(640px 이상)에서는 영상 아래쪽 위에 겹쳐 보여줍니다. */}
        <figcaption className="relative flex flex-wrap items-end justify-between gap-3 p-4 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-5">
            <span className="block max-w-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-white/80">{labels.label}</span>{' '}
              <span className="mt-1 block text-[15px] font-semibold leading-snug text-white">{labels.caption}</span>
            </span>
            {fullSrc && (
              <button
                type="button"
                onClick={openFull}
                className="lr-btn lr-btn-sm lr-press shrink-0 bg-white text-ink-900 hover:bg-brand-50"
              >
                <PlayGlyph /> {labels.playFull} <span className="font-normal text-ink-500">{labels.duration}</span>
              </button>
            )}
          </figcaption>
      </figure>

      {fullSrc && (
        <dialog
          ref={dialogRef}
          aria-label={labels.label}
          className="m-auto w-[min(960px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] bg-white p-0 backdrop:bg-black/75"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
            <p className="font-bold text-ink-900">{labels.label}</p>
            <button type="button" onClick={closeFull} className="lr-btn lr-btn-ghost lr-btn-sm">
              {labels.close}
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
          <p className="px-4 py-3 text-sm leading-relaxed text-ink-500">{labels.note}</p>
        </dialog>
      )}
    </>
  );
}
