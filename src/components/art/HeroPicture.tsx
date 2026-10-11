// 첫 화면에 쓰는 사진과, 그 위에 얹는 구름입니다.
//
// 사진 (public/hero-main.webp, 1989×791)
//   팀에서 만들어 준 그림이고, 제목·검색창 안내문·추천 검색어가 **그림 안에 그려져** 있습니다.
//   그래서 한국어 화면에서는 통째로 쓰고('full'), 다른 언어 화면에서는 한국어 글자가 없는
//   오른쪽(사람 + 도시)만 잘라서 씁니다('crop'). 글자는 화면에서 각 언어로 따로 그립니다.
//
// 움직임
//   사진은 이미 그려진 그림이라 그 안을 움직일 수 없습니다. 그래서 같은 색의 구름을 SVG 로 위에 얹고
//   CSS 로만 흘려보냅니다. 좌표는 사진의 실제 픽셀(1989×791) 그대로이고,
//   틀을 사진과 같은 비율로 잡아 두어 1:1 로 맞습니다.
//
//   머리카락을 흔드는 효과도 넣어 봤지만(머리 전체 일그러뜨리기 → 잔머리 몇 가닥) 어떻게 해도
//   그려진 그림 위에 덧댄 티가 나서 뺐습니다. 머리카락은 사진 그대로 둡니다.
//
// 구름 자리는 눈대중이 아니라 사진의 픽셀을 읽어서 정했습니다.
//   글자가 없는 하늘 띠는 y 88 위쪽뿐이라(그 아래는 제목과 손글씨), 구름은 그 띠 안에서만 지나갑니다.

import type { CSSProperties } from 'react';

const IMAGE = { src: '/hero-main.webp', w: 1989, h: 791 };

/**
 * 잘라 쓸 때 보여 줄 범위 (사람과 도시만, 한국어 글자는 빼고).
 * 사진의 한국어는 왼쪽 제목·검색창(x 105~1190)과 손글씨·화살표(x 1331~1578, y 60~330) 두 군데입니다.
 * 그래서 손글씨가 끝나는 x 1600 부터 오른쪽 끝까지를 씁니다.
 */
const CROP = { x: 1500, w: 1989 - 1500 };

const CLOUDS = [
  { cx: -180, cy: 46, rx: 115, ry: 19, dur: '92s', delay: '-12s' },
  { cx: -180, cy: 62, rx: 78, ry: 13, dur: '124s', delay: '-58s' },
  { cx: -180, cy: 34, rx: 140, ry: 16, dur: '150s', delay: '-104s' },
];

/**
 * 잘라 쓸 때, 머리 왼쪽에 남는 손글씨 꼬리("…한 걸 / …요")를 하늘색으로 덮습니다.
 * 손글씨는 x 1331~1578, y 60~330 인데 사람 얼굴이 x 1520 부터 시작해서 더 왼쪽으로 자를 수가 없습니다.
 * 머리(이 x 범위에서는 y 249 부터)에 닿지 않도록 y 240 까지만 덮고, 가장자리는 흐리게 해서 티가 안 나게 합니다.
 */
// 흐림(8)이 덮개 크기에 비해 세면 가운데까지 비쳐서 글씨가 남습니다. 덮개를 넉넉히 잡고 흐림은 약하게.
const PATCH = { x: 1444, y: 10, w: 1584 - 1444, h: 238 - 10 };

/**
 * 사진 위에 얹는 구름과 머리카락 (장식이라 화면낭독기에서는 읽지 않습니다)
 *
 * uid 가 왜 필요한가요?
 *   한국어 화면에는 이 그림이 두 번 들어갑니다 (넓은 화면용 전체 / 좁은 화면용 자른 것).
 *   filter 와 gradient 의 id 가 같으면 브라우저는 문서에서 **처음 만난 것 하나**만 씁니다.
 *   그런데 그 하나가 display:none 인 쪽에 있으면 참조가 풀리지 않아, 덮개가 통째로 안 그려집니다.
 *   (좁은 화면에서 손글씨가 그대로 보이던 원인이었습니다) 그래서 들어갈 때마다 id 를 다르게 줍니다.
 */
function HeroArt({ uid, patch = false }: { uid: string; patch?: boolean }) {
  const id = (name: string) => `lr-hero-${uid}-${name}`;
  return (
    <svg
      viewBox={`0 0 ${IMAGE.w} ${IMAGE.h}`}
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        {/* 그린 그림 위에 얹는 것이라, 가장자리를 흐리게 해야 붙여 놓은 티가 덜 납니다 */}
        <filter id={id('soft')} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id('patch')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b0dcfd" />
          <stop offset="100%" stopColor="#c2e6fd" />
        </linearGradient>
      </defs>

      {patch && (
        <rect
          x={PATCH.x}
          y={PATCH.y}
          width={PATCH.w}
          height={PATCH.h}
          rx="40"
          fill={`url(#${id('sky')})`}
          filter={`url(#${id('patch')})`}
        />
      )}

      <g filter={`url(#${id('soft')})`} fill="#ffffff" opacity="0.6">
        {CLOUDS.map((cloud, i) => (
          <g
            key={i}
            className="lr-cloud"
            style={{ '--lr-dur': cloud.dur, '--lr-delay': cloud.delay, '--lr-travel': '2320px' } as CSSProperties}
          >
            <ellipse cx={cloud.cx} cy={cloud.cy} rx={cloud.rx} ry={cloud.ry} />
            <ellipse cx={cloud.cx + cloud.rx * 0.55} cy={cloud.cy - cloud.ry * 0.5} rx={cloud.rx * 0.5} ry={cloud.ry} />
            <ellipse cx={cloud.cx - cloud.rx * 0.6} cy={cloud.cy + cloud.ry * 0.3} rx={cloud.rx * 0.45} ry={cloud.ry * 0.7} />
          </g>
        ))}
      </g>

    </svg>
  );
}

export function HeroPicture({
  variant,
  className = '',
  priority = false,
  fill = false,
  uid,
}: {
  /** full = 그림 전체 · crop = 사람과 도시만 (한국어 글자가 없는 쪽) */
  variant: 'full' | 'crop';
  className?: string;
  /** 첫 화면 맨 위에 보이는 사진이면 먼저 받아 오게 합니다 */
  priority?: boolean;
  /**
   * 스스로 비율을 정하지 않고 감싸는 칸을 꽉 채웁니다.
   * 배너 오른쪽에 사람만 붙일 때 씁니다. (감싸는 칸이 잘라 쓸 범위와 같은 비율이어야 합니다)
   */
  fill?: boolean;
  /**
   * 한 화면에 이 그림이 여러 번 들어갈 때 **반드시 서로 다르게** 주세요.
   *
   * SVG 의 filter·mask 는 id 로 찾는데, id 가 같으면 브라우저는 문서에서 처음 만난 것 하나만 씁니다.
   * 그 하나가 display:none 쪽에 있으면 참조가 풀려 손글씨 덮개가 통째로 안 그려집니다.
   * (넓은 화면용 배너와 좁은 화면용 그림이 둘 다 'crop' 이라 좁은 화면에서 한국어가 비쳤던 적이 있습니다)
   */
  uid?: string;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- public/ 에 둔 고정 그림이라 최적화가 필요 없습니다
    <img
      src={IMAGE.src}
      alt=""
      width={IMAGE.w}
      height={IMAGE.h}
      aria-hidden="true"
      fetchPriority={priority ? 'high' : 'auto'}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );

  if (variant === 'full') {
    return (
      <div className={`lr-hero-pic ${className}`} style={{ aspectRatio: `${IMAGE.w} / ${IMAGE.h}` }}>
        {img}
        <HeroArt uid={uid ?? 'full'} />
      </div>
    );
  }

  // 잘라 쓰기: 틀은 자를 범위의 비율로 두고, 안쪽에 사진 전체를 제 비율대로 깔아 왼쪽으로 밀어 둡니다.
  // 사진과 움직임이 같은 틀 안에 있으므로 똑같이 잘립니다.
  const stageWidth = (IMAGE.w / CROP.w) * 100;
  const stageLeft = -(CROP.x / CROP.w) * 100;

  return (
    <div
      // fill 일 때는 스스로 높이를 갖지 않습니다. 안쪽이 모두 absolute 라 h-full 을 주지 않으면 높이가 0 이 됩니다.
      className={`lr-hero-pic ${fill ? 'h-full w-full' : ''} ${className}`}
      style={fill ? undefined : { aspectRatio: `${CROP.w} / ${IMAGE.h}` }}
    >
      <div className="absolute top-0 h-full" style={{ width: `${stageWidth}%`, left: `${stageLeft}%` }}>
        {img}
        <HeroArt uid={uid ?? 'crop'} patch />
      </div>
    </div>
  );
}

/** 배너에서 사람 그림이 차지하는 가로 비율 (잘라 쓸 범위 ÷ 사진 전체) */
export const HERO_CROP_RATIO = CROP.w / IMAGE.w;
