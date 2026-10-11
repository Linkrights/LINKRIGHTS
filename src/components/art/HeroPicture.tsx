// 첫 화면에 쓰는 사진과, 그 위에 얹는 움직임(구름 · 머리카락)입니다.
//
// 사진 (public/hero-main.webp, 1989×791)
//   팀에서 만들어 준 그림이고, 제목·검색창 안내문·추천 검색어가 **그림 안에 그려져** 있습니다.
//   그래서 한국어 화면에서는 통째로 쓰고('full'), 다른 언어 화면에서는 한국어 글자가 없는
//   오른쪽(사람 + 도시)만 잘라서 씁니다('crop'). 글자는 화면에서 각 언어로 따로 그립니다.
//
// 움직임
//   사진은 이미 그려진 그림이라 그 안의 구름이나 머리카락을 움직일 수 없습니다.
//   그래서 사진과 같은 색의 구름·머리카락을 SVG 로 위에 얹고 CSS 로만 흔듭니다.
//   좌표는 사진의 실제 픽셀(1989×791) 그대로입니다. 틀을 사진과 같은 비율로 잡아 두어 1:1 로 맞습니다.
//
// 자리는 눈대중이 아니라 사진의 픽셀을 읽어서 정했습니다.
//   - 글자가 없는 하늘 띠: y 88 위쪽뿐 (그 아래는 제목과 손글씨). 그래서 구름은 그 띠 안에서만 지나갑니다.
//   - 묶은 머리: x 1526~1785, y 217~519. 머리색 #32323d. 머리카락은 그 오른쪽 끝에서 흘러나옵니다.

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
 * 머리카락이 바람에 일렁이는 자리.
 *
 * 선을 몇 가닥 그려 붙이면 수염처럼 보여서, 그렇게 하지 않습니다.
 * 대신 **사진의 머리카락 부분을 한 겹 더 깔고 그 겹만 일그러뜨립니다.**
 * (feTurbulence 로 만든 구름 무늬를 feDisplacementMap 에 넣어 픽셀을 밀어 줍니다)
 * 그려진 머리카락 자체가 흔들리고, 하늘과 맞닿은 머리 윤곽선이 함께 울렁입니다.
 *
 * 자리는 사진의 픽셀을 20칸 간격으로 찍어서 "머리카락 / 살결 / 하늘"을 가려내 정했습니다.
 * 얼굴에 닿으면 이목구비가 일그러지므로, 살결이 나온 칸(x 1600~1640, y 260~400)은 반드시 피합니다.
 */
const HAIR = {
  /** 바람이 닿는 곳 — 머리 윗부분과 묶은 머리. 가장자리는 흐리게 해서 경계가 보이지 않게 합니다. */
  blobs: [
    { cx: 1700, cy: 290, rx: 75, ry: 75 },
    { cx: 1760, cy: 350, rx: 60, ry: 55 },
  ],
  /** 일그러뜨릴 범위 (밀려날 만큼 넉넉히). 가리개보다 넉넉해야 가장자리가 끊기지 않습니다. */
  area: { x: 1590, y: 190, w: 330, h: 260 },
  /** 몇 픽셀이나 밀지 — 사진이 1989px 기준이라 18이면 화면에서 9px 남짓 움직입니다 */
  scale: 18,
};

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
        {/* 바람: 구름 무늬를 천천히 바꿔 가며 그 무늬대로 픽셀을 밀어 줍니다.
            무늬가 계속 변하므로 같은 모양이 되풀이되지 않고, 숨 쉬듯 일렁입니다. */}
        <filter
          id={id('wind')}
          filterUnits="userSpaceOnUse"
          x={HAIR.area.x}
          y={HAIR.area.y}
          width={HAIR.area.w}
          height={HAIR.area.h}
        >
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="5" result="wind">
            <animate
              attributeName="baseFrequency"
              dur="7s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.35;0.7;1"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
              values="0.008 0.014;0.012 0.021;0.0071 0.0124;0.008 0.014"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="wind"
            scale={HAIR.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* 바람이 닿는 곳만 남기는 가리개. 가장자리를 흐리게 해야 경계선이 보이지 않습니다. */}
        <filter id={id('maskblur')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        {/* 사진 전체를 필터에 넣으면 매 장면마다 1989×791 을 다시 그려야 합니다.
            머리 언저리만 잘라서 넣으면 그 작은 네모만 계산하면 됩니다. */}
        <clipPath id={id('hairbox')}>
          <rect x={HAIR.area.x} y={HAIR.area.y} width={HAIR.area.w} height={HAIR.area.h} />
        </clipPath>
        <mask
          id={id('hair')}
          maskUnits="userSpaceOnUse"
          x={HAIR.area.x}
          y={HAIR.area.y}
          width={HAIR.area.w}
          height={HAIR.area.h}
        >
          <g filter={`url(#${id('maskblur')})`} fill="#ffffff">
            {HAIR.blobs.map((blob, i) => (
              <ellipse key={i} cx={blob.cx} cy={blob.cy} rx={blob.rx} ry={blob.ry} />
            ))}
          </g>
        </mask>
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

      {/* 머리카락: 사진의 머리 부분만 한 겹 더 깔고, 그 겹만 바람 무늬대로 일그러뜨립니다.
          밑에는 원래 사진이 그대로 있으므로, 가리개 바깥은 전혀 건드리지 않습니다. */}
      <g className="lr-hair-wind" mask={`url(#${id('hair')})`}>
        <g filter={`url(#${id('wind')})`}>
          <g clipPath={`url(#${id('hairbox')})`}>
            <image href={IMAGE.src} x="0" y="0" width={IMAGE.w} height={IMAGE.h} preserveAspectRatio="none" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function HeroPicture({
  variant,
  className = '',
  priority = false,
}: {
  /** full = 한국어 화면(그림 전체) · crop = 다른 언어 화면(사람과 도시만) */
  variant: 'full' | 'crop';
  className?: string;
  /** 첫 화면 맨 위에 보이는 사진이면 먼저 받아 오게 합니다 */
  priority?: boolean;
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
        <HeroArt uid="full" />
      </div>
    );
  }

  // 잘라 쓰기: 틀은 자를 범위의 비율로 두고, 안쪽에 사진 전체를 제 비율대로 깔아 왼쪽으로 밀어 둡니다.
  // 사진과 움직임이 같은 틀 안에 있으므로 똑같이 잘립니다.
  const stageWidth = (IMAGE.w / CROP.w) * 100;
  const stageLeft = -(CROP.x / CROP.w) * 100;

  return (
    <div className={`lr-hero-pic ${className}`} style={{ aspectRatio: `${CROP.w} / ${IMAGE.h}` }}>
      <div className="absolute top-0 h-full" style={{ width: `${stageWidth}%`, left: `${stageLeft}%` }}>
        {img}
        <HeroArt uid="crop" patch />
      </div>
    </div>
  );
}
