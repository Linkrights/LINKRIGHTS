'use client';

// 첫 화면 **배너 뒤**에 깔리는 배경 영상입니다.
//
// 예전 HomeHero.tsx 가 영상을 화면 전체 배경으로 쓰고 있었는데, 첫 화면이 사진 배너로 바뀌면서
// 그 파일은 아무 데서도 쓰이지 않게 됐습니다. 거기 있던 "조심해서 트는" 규칙만 떼어내 여기로 옮겼습니다.
//
// 조심한 것
//   - 움직임 줄이기, 데이터 절약 모드, 느린 연결(2G)에서는 자동으로 틀지 않고 대표 이미지만 보여줍니다.
//     그래도 보고 싶으면 재생 단추를 누르면 됩니다.
//   - 5초 넘게 움직이는 화면은 멈출 수 있어야 해서(접근성) 멈춤 단추를 답니다.
//   - 화면에서 벗어나면 잠시 멈춥니다. (배터리와 데이터를 아끼려고)
//   - 소리는 끕니다. 소리가 나는 자동 재생은 브라우저가 막기도 하고, 갑자기 소리가 나면 놀랍니다.
//   - 페이지가 다 뜬 뒤에 영상을 받아옵니다. 글과 단추는 서버에서 그리므로 영상이 늦거나 실패해도 그대로 보입니다.

import { useEffect, useRef, useState } from 'react';

export interface HeroVideoSources {
  /** 태블릿·데스크톱용 */
  desktop: string;
  /** 휴대폰(768px 미만)용. 없으면 desktop 을 씁니다. */
  mobile?: string;
}

export interface HeroVideoLabels {
  play: string;
  pause: string;
}

function PlayGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
    </svg>
  );
}

export function HeroVideoBackdrop({
  sources,
  poster,
  labels,
}: {
  sources: HeroVideoSources;
  /** 영상을 받아오기 전에 먼저 보여줄 그림 */
  poster?: string;
  labels: HeroVideoLabels;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // 언제 받아올지: 움직임 줄이기·데이터 절약·느린 연결이면 받아오지 않습니다.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    const slow =
      connection?.saveData === true || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
    if (reduce || slow) return;
    const pick = () =>
      setSrc(sources.mobile && window.matchMedia('(max-width: 767px)').matches ? sources.mobile : sources.desktop);
    if (document.readyState === 'complete') {
      const timer = window.setTimeout(pick, 200);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener('load', pick, { once: true });
    return () => window.removeEventListener('load', pick);
  }, [sources]);

  // 화면에서 벗어나면 멈춥니다. (이용자가 직접 멈춰 둔 것은 건드리지 않습니다)
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
    userPaused.current = false;
    if (!src) {
      // 자동으로 틀지 않은 환경에서도 누르면 틀어 줍니다.
      setSrc(sources.mobile && window.matchMedia('(max-width: 767px)').matches ? sources.mobile : sources.desktop);
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
    <>
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element -- public 에 둔 고정 그림이라 최적화가 필요 없습니다
          <img src={poster} alt="" className="lr-hero-video-layer absolute inset-0 h-full w-full object-cover" />
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
            tabIndex={-1}
            onPlaying={() => {
              setReady(true);
              setPlaying(true);
            }}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
            className={`lr-hero-video-layer absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              ready ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        {/* 글자가 읽히도록 덮는 겹.
            영상 안에 흰 벽·흰 하늘이 있어(밝기 0.99) 덮개만으로는 흰 글자가 1.5:1 까지 떨어집니다.
            그래서 영상 자체를 lr-hero-video-layer 로 어둡게 깔고, 덮개는 오히려 옅게 뒀습니다.
            이 조합이면 가장 밝은 장면에서도 흰 글자가 5.5:1 이상으로 읽힙니다. 배너 카드가 놓이는 가운데는 옅게, 글자가 놓이는 위쪽은 짙게. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,26,56,0.44)_0%,rgba(8,26,56,0.34)_45%,rgba(8,26,56,0.30)_100%)]" />
      </div>

      {!failed && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? labels.pause : labels.play}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/45 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      )}
    </>
  );
}
