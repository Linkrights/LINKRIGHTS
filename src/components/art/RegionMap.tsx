'use client';

// "도움이 필요하다면"에 쓰는 지역 지도입니다. 시·도 한 칸을 누르면 그 지역의 도움받을 곳 목록으로 갑니다.
//
// 지도 모양에 대해
//   - 17개 시·도를 한 칸씩 손으로 단순하게 그린 그림입니다. 서로의 위치 관계(위·아래·좌·우)와
//     어느 도 안에 어느 광역시가 들어앉아 있는지는 실제와 같게 맞췄고, 맞닿은 칸끼리는 같은 꼭짓점을 씁니다.
//   - 다만 정확한 행정 경계가 아닙니다. 경계선 자료(수십 MB)를 들여오지 않고도 "서울 권역, 경기 권역"을
//     눌러서 고를 수 있게 하려고 고른 방식입니다. 그래서 지도 아래에도 "대략 그린 그림"이라고 적어 둡니다.
//   - 지도 서비스(API)를 쓰지 않으므로 비용이 들지 않고, 이용자의 위치를 지도 회사에 보내지도 않습니다.
//
// 그리는 차례 (SVG 는 나중에 그린 것이 위에 옵니다)
//   1) 모든 칸을 한 번에 굵게 칠해 바깥 테두리(해안선)를 만듭니다. 조각이 아니라 한 덩어리의 땅으로 보이게 하는 부분입니다.
//   2) 도(道)를 그립니다.
//   3) 광역시를 그 위에 그립니다. ← 도 안에 들어앉아 있어서, 먼저 그리면 도에 가려 보이지 않습니다.
//
// 지역 목록과 기관 수는 실제 자료(content/regions.json, organizations.json)에서 받아옵니다.
// 등록된 기관이 없는 지역은 흐린 칸으로 두고 누를 수 없게 합니다.

import Link from 'next/link';
import { REGIONS } from '@/lib/regions';

const SIZE = { w: 320, h: 440 };

interface Area {
  /** 칸 모양 (SVG polygon points) */
  points: string;
  /** 도(道)인지, 도 안에 들어앉은 광역시인지 — 색과 그리는 차례를 달리합니다 */
  kind?: 'city';
  /** 이름을 쓸 자리 */
  label: { x: number; y: number; anchor?: 'middle' | 'start' | 'end' };
  /** 이름이 칸 밖에 있을 때 칸과 이어 주는 실선 */
  leader?: [number, number, number, number];
}

/** content/regions.json 의 key → 지도에서 차지하는 칸 */
const AREAS: Record<string, Area> = {
  // ── 도 ────────────────────────────────────────────────
  // 맞닿은 칸끼리는 같은 꼭짓점을 씁니다. 하나라도 어긋나면 그 사이에 흰 틈이 생깁니다.
  // 세 지역이 만나는 자리: 경기·강원·충북 (172,130) / 충남·충북·전북 (140,212) /
  //                      충북·경북·전북 (182,222) / 전북·경북·경남 (190,243)
  경기: {
    points: '84,46 172,38 178,78 172,130 140,150 108,150 84,140 70,110 72,66',
    label: { x: 122, y: 134 },
  },
  강원: {
    points: '172,38 240,30 272,52 286,92 280,146 214,152 186,142 172,130 178,78',
    label: { x: 232, y: 92 },
  },
  충남: {
    points: '84,140 108,150 140,150 142,176 146,200 140,212 112,224 84,222 62,198 56,168 66,150',
    label: { x: 92, y: 186 },
  },
  충북: {
    points: '172,130 186,142 214,152 222,186 208,212 182,222 140,212 146,200 142,176 140,150',
    label: { x: 190, y: 180 },
  },
  경북: {
    points: '214,152 280,146 288,180 290,212 274,244 190,243 182,222 208,212 222,186',
    label: { x: 252, y: 186 },
  },
  전북: {
    points: '84,222 112,224 140,212 182,222 190,243 176,272 134,284 96,276 72,268 68,240',
    label: { x: 122, y: 250 },
  },
  경남: {
    points: '190,243 274,244 278,268 258,304 250,320 224,324 190,316 172,292 176,272',
    label: { x: 208, y: 282 },
  },
  전남: {
    points: '72,268 96,276 134,284 176,272 172,292 166,326 140,354 100,360 66,338 54,304',
    label: { x: 110, y: 334 },
  },
  제주: {
    points: '50,392 78,386 98,396 96,412 72,420 48,410',
    label: { x: 72, y: 404 },
  },

  // ── 광역시 (도 위에 그립니다) ───────────────────────────
  서울: {
    points: '112,74 140,72 148,88 140,104 114,104 104,88',
    kind: 'city',
    label: { x: 126, y: 93 },
  },
  인천: {
    points: '74,92 100,88 104,106 92,118 74,114 68,102',
    kind: 'city',
    label: { x: 86, y: 107 },
  },
  세종: {
    points: '138,172 156,168 160,184 142,190',
    kind: 'city',
    label: { x: 130, y: 183, anchor: 'end' },
    leader: [132, 180, 139, 178],
  },
  대전: {
    points: '148,194 168,192 172,208 152,214',
    kind: 'city',
    label: { x: 182, y: 208, anchor: 'start' },
    leader: [171, 203, 180, 205],
  },
  대구: {
    points: '214,210 240,208 244,228 220,234',
    kind: 'city',
    label: { x: 229, y: 225 },
  },
  울산: {
    points: '256,238 280,242 278,264 254,264',
    kind: 'city',
    label: { x: 288, y: 256, anchor: 'start' },
    leader: [279, 253, 286, 254],
  },
  광주: {
    points: '90,296 114,294 116,314 94,318',
    kind: 'city',
    label: { x: 82, y: 308, anchor: 'end' },
    leader: [84, 305, 91, 304],
  },
  부산: {
    points: '228,292 252,294 250,316 226,314',
    kind: 'city',
    label: { x: 260, y: 318, anchor: 'start' },
    leader: [251, 308, 258, 314],
  },
};

export function RegionMap({
  locale,
  counts,
  label,
}: {
  locale: string;
  /** 시·도별 등록된 기관 수 */
  counts: Record<string, number>;
  /** 화면낭독기용 설명 */
  label: string;
}) {
  // 도를 먼저, 광역시를 나중에 그립니다. (자료 차례대로 그리면 서울이 경기에 덮여 보이지 않습니다)
  const drawOrder = [...REGIONS].sort(
    (a, b) => Number(AREAS[a.key]?.kind === 'city') - Number(AREAS[b.key]?.kind === 'city'),
  );

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${SIZE.w} ${SIZE.h}`} role="img" aria-label={label} className="h-auto w-full max-w-[24rem]">
        {/* 1) 바깥 테두리: 모든 칸을 굵은 선으로 한 번 칠해 한 덩어리의 땅처럼 보이게 합니다 */}
        <g aria-hidden="true" className="lr-map-coast">
          {drawOrder.map((region) =>
            AREAS[region.key] ? <polygon key={region.key} points={AREAS[region.key].points} /> : null,
          )}
        </g>

        {/* 2)·3) 칸 하나하나 */}
        {drawOrder.map((region) => {
          const area = AREAS[region.key];
          if (!area) return null;

          const count = counts[region.key] ?? 0;
          const empty = count === 0;
          const name = region.name.ko;

          const shape = (
            <>
              <polygon points={area.points} className="lr-map-area" data-kind={area.kind} data-empty={empty} />
              {area.leader && (
                <line
                  x1={area.leader[0]}
                  y1={area.leader[1]}
                  x2={area.leader[2]}
                  y2={area.leader[3]}
                  className="lr-map-leader"
                />
              )}
              <text
                x={area.label.x}
                y={area.label.y}
                textAnchor={area.label.anchor ?? 'middle'}
                className="lr-map-label"
                data-kind={area.kind}
                data-empty={empty}
              >
                {name}
              </text>
            </>
          );

          // 등록된 기관이 없는 지역은 눌러도 보여 줄 것이 없으므로 링크를 걸지 않습니다.
          if (empty) {
            return (
              <g key={region.key} aria-hidden="true">
                {shape}
              </g>
            );
          }

          return (
            <Link key={region.key} href={`/${locale}/organizations?region=${encodeURIComponent(region.key)}`}>
              <g className="lr-map-pin">{shape}</g>
            </Link>
          );
        })}
      </svg>
    </figure>
  );
}
