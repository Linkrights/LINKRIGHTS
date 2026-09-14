'use client';

// 스크롤해서 화면에 들어올 때 목록 칸(li)이 아주 살짝 올라오며 나타나게 하는 감싸개입니다.
// 안에 들어가는 카드(서버에서 그리는 부분)는 그대로 두고, 바깥 li 에만 움직임을 줍니다.
// - 한 번 나타난 뒤에는 다시 움직이지 않습니다. (once)
// - 같은 줄에 나란히 있는 칸은 아주 조금씩 차례로 나타납니다. (index)
// - "동작 줄이기"를 켠 사용자에게는 움직임 없이 바로 보여줍니다.
// - 자바스크립트가 꺼진 환경에서는 globals.css 의 [data-reveal] 규칙으로 항상 보이게 합니다.

import { LazyMotion, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// 움직임 기능은 첫 화면 코드에 넣지 않고, 페이지가 뜬 뒤 따로 불러옵니다. (모바일 로딩 부담 줄이기)
const loadFeatures = () => import('./motion-features').then((mod) => mod.default);

export function Reveal({
  children,
  className,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  /** 목록 안에서의 순서. 한 줄(최대 3칸) 안에서만 살짝 늦게 나타나게 합니다. */
  index?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={loadFeatures} strict>
      <m.li
        data-reveal=""
        className={className}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut', delay: (index % 3) * 0.06 }
        }
      >
        {children}
      </m.li>
    </LazyMotion>
  );
}
