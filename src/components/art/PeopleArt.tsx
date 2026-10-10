// 첫 화면에 쓰는 그림입니다. (장식이라 화면낭독기에서는 읽지 않습니다)
//
// 어떤 그림인가요
//   가방을 멘 한 사람이 도시를 배경으로 고개를 들어 위를 올려다보는 옆모습입니다.
//   "여기서 뭘 물어봐도 괜찮다"는 느낌을 주려고 가까이서 잡았고, 하늘색 계열로만 맞췄습니다.
//
// 사진 대신 직접 그린 그림을 쓰는 이유
//   - 실제 청소년의 사진을 쓰려면 동의가 필요하고, 누군가를 특정해 보이게 할 수 있습니다.
//   - 옆모습이라 이목구비를 자세히 그리지 않아도 되고, 특정 나라·민족을 가리키는 표시
//     (국기, 전통 의상 등)는 넣지 않았습니다.
//
// 얼굴을 그린 방법
//   머리는 따로 떼어 (0,0)~(100,104) 안에 옆모습으로 그린 뒤, 통째로 14도 젖혀서 "올려다보는" 자세를 만듭니다.
//   이마 → 눈썹뼈 → 콧대 → 코끝 → 인중 → 입술 → 턱 순서로 점을 찍어야 옆모습으로 보입니다.
//   코끝(x=6)이 눈썹뼈(x=17)보다 11만큼 앞으로 나오는 것이 옆모습의 핵심입니다.
//
// 움직임
//   구름이 천천히 지나가고, 묶은 머리에서 흘러나온 머리카락이 바람에 흔들립니다.
//   움직임은 전부 CSS 로만 합니다(globals.css 의 lr-cloud / lr-strand). 자바스크립트를 쓰지 않으므로
//   화면이 보이지 않을 때 브라우저가 알아서 쉬고, 움직임 줄이기를 켠 이용자에게는 멈춥니다.

import type { CSSProperties } from 'react';

const C = {
  skin: '#f1c7a5',
  skinShade: '#d9a37f',
  hair: '#2d2832',
  line: '#2d2832',
  blush: '#e9a18c',
  coat: '#f8f5ef',
  coatShade: '#e7e0d4',
  bag: '#2f4f86',
  bagLight: '#43669f',
  far: '#c6daf1',
  near: '#aecae9',
  window: '#dceaf8',
};

/** 구름 한 덩이 */
function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.78">
      <ellipse cx="0" cy="0" rx="30" ry="13" />
      <ellipse cx="22" cy="-8" rx="20" ry="12" />
      <ellipse cx="-20" cy="4" rx="17" ry="9" />
    </g>
  );
}

/**
 * 구름 셋. 모두 화면 왼쪽 밖(x=-80)에서 시작합니다.
 * 시작 시각(delay)을 음수로 주어 "이미 지나가던 중"으로 보이게 하고,
 * 걸리는 시간(dur)은 서로 다르게 해 줄지어 가지 않게 합니다.
 */
const CLOUDS = [
  { x: -80, y: 52, scale: 1, dur: '78s', delay: '-8s' },
  { x: -80, y: 34, scale: 0.72, dur: '96s', delay: '-40s' },
  { x: -80, y: 76, scale: 0.55, dur: '124s', delay: '-78s' },
  // 넷째는 하늘이 비는 순간을 줄이려고 둡니다. 셋만 두면 가끔 셋이 동시에 화면 밖으로 나갑니다.
  { x: -80, y: 62, scale: 0.8, dur: '108s', delay: '-54s' },
];

/**
 * 묶은 머리에서 흘러나와 바람에 날리는 머리카락.
 * 머리 묶음(기울인 묶음 바깥, 화면 좌표로 대략 (241,44))에서 시작해 뒤쪽(오른쪽)으로 흘러갑니다.
 * 흔들리는 시간을 조금씩 어긋나게 해야 한 다발로 같이 움직이지 않습니다.
 */
const STRANDS = [
  { d: 'M240 36C258 32 270 35 277 43', w: 3, dur: '3.4s', delay: '0s' },
  { d: 'M245 46C263 44 276 49 283 58', w: 2.5, dur: '4.2s', delay: '-0.7s' },
  { d: 'M243 55C260 57 271 62 277 70', w: 2, dur: '3.8s', delay: '-1.4s' },
];

function Head() {
  return (
    <g transform="translate(150 44) rotate(-14 46 56)">
      {/* 머리카락 (뒤) — 얼굴보다 조금 크게 두어 가장자리로만 보이게 합니다 */}
      <path d="M54-2C28-2 16 20 17 50c0 22 6 42 18 54l9 10c34 0 56-26 56-62C100 20 84-2 54-2z" fill={C.hair} />
      {/* 묶은 머리 */}
      <circle cx="103" cy="12" r="17" fill={C.hair} />
      <path d="M84 24c5-7 12-11 19-12" stroke={C.hair} strokeWidth="11" strokeLinecap="round" fill="none" />

      {/* 얼굴 옆선 — 이마 → 눈썹뼈 → 콧대 → 코끝 → 인중 → 입술 → 턱 → 턱선 → 뒤통수 */}
      <path
        d="M54 8C36 8 26 18 22 30c-3 9-6 12-5 17 1 4 4 3 3 7-2 5-14 7-14 11 0 5 11 2 13 6 2 5-6 5-5 9 1 5 6 6 9 11 4 7 14 11 25 11 20 0 36-18 38-42C94 34 84 8 54 8z"
        fill={C.skin}
      />
      {/* 앞머리 — 이마에서 뒤로 넘긴 모양 */}
      <path
        d="M18 46C16 18 34 2 58 2c28 0 44 22 42 50 0 4-5 4-6-1C90 26 76 16 58 18 40 20 26 30 23 48c-1 5-4 4-5-2z"
        fill={C.hair}
      />

      {/* 이목구비 — 옆모습이라 눈 하나와 작은 입만 */}
      <path d="M24 43c4-4 9-5 13-3" stroke={C.line} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M23 53c4-3 9-3 13 0" stroke={C.line} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M15 81c3 2 7 1 9-2" stroke={C.line} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="34" cy="68" rx="11" ry="6" fill={C.blush} opacity="0.45" />
    </g>
  );
}

export function PeopleArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 320" role="presentation" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="lr-art-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe2f5" />
          <stop offset="60%" stopColor="#e6f0fb" />
          <stop offset="100%" stopColor="#f3f8fd" />
        </linearGradient>
        <linearGradient id="lr-art-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbe9f8" />
          <stop offset="100%" stopColor="#eef5fc" />
        </linearGradient>
        {/* 사람이 그림 밖으로 삐져나오지 않게 둥근 테두리로 잘라 냅니다 */}
        <clipPath id="lr-art-frame">
          <rect x="0" y="0" width="380" height="320" rx="30" />
        </clipPath>
      </defs>

      <g clipPath="url(#lr-art-frame)">
        <rect x="0" y="0" width="380" height="320" fill="url(#lr-art-sky)" />

        {/* 구름 — 왼쪽 밖에서 시작해 천천히 오른쪽으로 지나갑니다 (globals.css 의 lr-cloud) */}
        {CLOUDS.map((cloud, i) => (
          <g
            key={i}
            className="lr-cloud"
            style={{ '--lr-dur': cloud.dur, '--lr-delay': cloud.delay } as CSSProperties}
          >
            <Cloud x={cloud.x} y={cloud.y} scale={cloud.scale} />
          </g>
        ))}

        {/* 먼 도시 */}
        <g fill={C.far}>
          <rect x="2" y="188" width="36" height="110" rx="4" />
          <rect x="42" y="150" width="28" height="148" rx="4" />
          <rect x="74" y="204" width="38" height="94" rx="4" />
          <rect x="116" y="168" width="26" height="130" rx="4" />
          <rect x="268" y="198" width="28" height="100" rx="4" />
          <rect x="348" y="178" width="30" height="120" rx="4" />
        </g>
        {/* 가까운 도시 */}
        <g fill={C.near}>
          <rect x="26" y="216" width="30" height="82" rx="4" />
          <rect x="96" y="228" width="26" height="70" rx="4" />
          <rect x="312" y="122" width="38" height="176" rx="5" />
          <path d="M312 122l19-16 19 16z" />
        </g>
        {/* 창문 */}
        <g fill={C.window} opacity="0.85">
          <rect x="48" y="162" width="7" height="10" rx="2" />
          <rect x="59" y="162" width="7" height="10" rx="2" />
          <rect x="48" y="180" width="7" height="10" rx="2" />
          <rect x="59" y="180" width="7" height="10" rx="2" />
          <rect x="122" y="180" width="7" height="10" rx="2" />
          <rect x="122" y="198" width="7" height="10" rx="2" />
          <rect x="320" y="138" width="8" height="11" rx="2" />
          <rect x="334" y="138" width="8" height="11" rx="2" />
          <rect x="320" y="158" width="8" height="11" rx="2" />
          <rect x="334" y="158" width="8" height="11" rx="2" />
          <rect x="320" y="178" width="8" height="11" rx="2" />
          <rect x="334" y="178" width="8" height="11" rx="2" />
        </g>

        {/* 땅 */}
        <rect x="0" y="294" width="380" height="26" fill="url(#lr-art-ground)" />

        {/* 목 — 머리와 외투 사이 (외투가 아랫부분을 덮습니다).
            얼굴보다 한 톤 어둡게 해야 턱선이 목에 묻히지 않습니다. */}
        <path d="M192 126l38-7 6 83-42 4z" fill={C.skinShade} />

        {/* 바람에 날리는 머리카락 — 머리를 그린 뒤 그 위에 얹습니다 (globals.css 의 lr-strand) */}
        {STRANDS.map((strand, i) => (
          <path
            key={i}
            className="lr-strand"
            style={{ '--lr-dur': strand.dur, '--lr-delay': strand.delay } as CSSProperties}
            d={strand.d}
            stroke={C.hair}
            strokeWidth={strand.w}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        <Head />

        {/* 외투 */}
        <path d="M94 320c8-64 42-102 92-114 22-5 48-2 66 8 38 22 54 64 60 106z" fill={C.coat} />
        <path d="M94 320c8-64 42-102 92-114-32 26-50 66-54 114z" fill={C.coatShade} opacity="0.55" />
        {/* 깃 — 외투와 같은 흰색이라 선을 그리면 고리처럼 보입니다.
            목이 들어가는 자리에 그늘만 한 겹 깔아 깃처럼 보이게 합니다. */}
        <path d="M186 206c14-9 40-11 54-1-8 13-20 19-28 19-10 0-19-6-26-18z" fill={C.coatShade} />

        {/* 가방 */}
        <path d="M256 226c28-10 56 8 66 40 8 24 8 42 6 54h-66c-4-28-12-68-6-94z" fill={C.bag} />
        <path d="M280 258c15-6 29 2 35 16 4 11 4 22 2 30h-32c-2-17-5-36-5-46z" fill={C.bagLight} opacity="0.5" />
        {/* 어깨끈 */}
        <path d="M206 210c16 24 24 62 22 110h20c2-48-8-88-26-116z" fill={C.bag} />
      </g>
    </svg>
  );
}
