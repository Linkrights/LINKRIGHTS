'use client';

// 내용이 옆으로 천천히 흐르는 띠(마퀴)입니다. 움직임은 globals.css 의 .lr-marquee 규칙(CSS 애니메이션)이 담당합니다.
// - 같은 내용을 4벌 이어 붙이고 한 벌 너비만큼 옮기기를 반복해, 넓은 화면에서도 끊김이나 빈 곳 없이 흐릅니다.
// - 화면낭독기·키보드는 첫 번째 벌만 읽고 이동합니다. 나머지 복제본은 inert·aria-hidden 으로 제외합니다.
// - 마우스를 올리면 멈추고, 키보드로 들어오면 처음 위치로 돌아가 멈춥니다. (선택한 항목이 가려지지 않게)
// - 누구나 멈출 수 있도록 [멈춤/재생] 버튼을 둡니다.
// - "동작 줄이기"를 켠 사용자에게는 움직이지 않는 목록으로 보여줍니다.

import { useState, type ReactNode } from 'react';

const COPIES = 4;

export function Marquee({
  children,
  pauseLabel,
  playLabel,
}: {
  children: ReactNode;
  pauseLabel: string;
  playLabel: string;
}) {
  const [paused, setPaused] = useState(false);

  return (
    <div className="lr-marquee" data-paused={paused ? '' : undefined}>
      <div className="lr-marquee-viewport">
        <div className="lr-marquee-track">
          <div className="lr-marquee-group">{children}</div>
          {Array.from({ length: COPIES - 1 }, (_, index) => (
            <div key={index} className="lr-marquee-group" aria-hidden="true" inert>
              {children}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        className="lr-marquee-toggle lr-btn lr-btn-ghost lr-btn-sm shrink-0"
      >
        {paused ? playLabel : pauseLabel}
      </button>
    </div>
  );
}
