'use client';

// 화면에 들어왔을 때 0에서 실제 숫자까지 차분하게 올라가는 숫자입니다.
// - 서버가 그린 HTML 에는 처음부터 실제 숫자가 들어 있습니다. (검색엔진·자바스크립트 꺼짐 대비)
// - 페이지가 뜬 뒤 아직 화면 밖에 있으면 0으로 준비해 두었다가, 화면에 들어오면 한 번만 올립니다.
// - 이미 화면에 보이는 상태이거나 "동작 줄이기"를 켠 경우에는 움직이지 않고 실제 숫자를 그대로 둡니다.
// - 화면낭독기에는 올라가는 중간 숫자 대신 실제 숫자만 읽힙니다.

import { useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function CountUp({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const waiting = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduceMotion) {
      waiting.current = false;
      setDisplay(value);
      return;
    }
    const rect = element.getBoundingClientRect();
    const visibleNow = rect.top < window.innerHeight && rect.bottom > 0;
    if (visibleNow) return;
    waiting.current = true;
    setDisplay(0);
  }, [reduceMotion, value]);

  useEffect(() => {
    if (!inView || !waiting.current) return;
    waiting.current = false;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return (
    <>
      <span
        ref={ref}
        aria-hidden="true"
        className="inline-block text-right tabular-nums"
        style={{ minWidth: `${String(value).length}ch` }}
      >
        {display}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
