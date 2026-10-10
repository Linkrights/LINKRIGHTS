'use client';

// "도움이 필요하다면"에 쓰는 지역 지도입니다. 시·도 한 칸을 누르면 그 지역의 도움받을 곳 목록으로 갑니다.
//
// 지도 모양
//   실제 시·도 경계 자료를 옮겨 온 것입니다. (src/lib/regionShapes.ts — scripts/build-region-shapes.mjs 가 만듭니다)
//   원본은 geoBoundaries gbOpen KOR ADM1 이며 저작권이 없는 자료(Public Domain)입니다.
//   화면에서 320px 남짓으로 그리므로, 그 크기에서 보이지 않는 점과 아주 작은 섬은 미리 덜어냈습니다.
//   지도 서비스(API)를 쓰지 않으므로 비용이 들지 않고, 이용자의 위치를 지도 회사에 보내지도 않습니다.
//
// 그리는 차례 (SVG 는 나중에 그린 것이 위에 옵니다. 겹치는 것을 피하려면 차례가 중요합니다)
//   1) 도(道)  2) 광역시 — 도 안에 들어앉아 있어 먼저 그리면 가려집니다. REGION_SHAPES 가 그 차례로 정렬돼 있습니다.
//   3) 이름 — 모두 맨 위에 한 번에. 칸과 같은 묶음에 넣으면, 이름이 이웃 칸 위로 조금만 넘어가도
//      나중에 그려지는 그 이웃 칸에 덮여 사라집니다. (경기 이름이 강원에 덮였던 적이 있습니다)
//      이름은 누르는 것을 가로채지 않게 해 두어(pointer-events: none), 글자 위를 눌러도 칸이 눌립니다.
//
// 지역 목록과 기관 수는 실제 자료(content/regions.json, organizations.json)에서 받아옵니다.
// 등록된 기관이 없는 지역은 흐린 칸으로 두고 누를 수 없게 합니다.

import Link from 'next/link';
import { REGIONS } from '@/lib/regions';
import { MAP_SIZE, REGION_SHAPES } from '@/lib/regionShapes';
import type { Locale } from '@/lib/types';

/**
 * 이름을 넣을 자리 손보기. 기본값은 경계의 넓이 중심(regionShapes.ts)입니다.
 *
 * 손봐야 하는 경우가 둘 있습니다.
 *   1) 칸이 글자보다 작은 광역시 — 밖으로 빼고 가는 선으로 이어 줍니다. (from)
 *   2) 넓이 중심이 엉뚱한 곳에 찍히는 경우 — 경기는 서울을 둘러싸고 있어서 중심이 서울 위에 얹힙니다.
 */
const LABEL_FIX: Record<string, { x: number; y: number; anchor?: 'start' | 'end'; from?: [number, number] }> = {
  경기: { x: 163, y: 107 }, // 넓이 중심이 서울과 겹쳐서 서울 아래로
  충남: { x: 130, y: 180 }, // 세종 이름표와 겹쳐서 서남쪽으로
  세종: { x: 152, y: 158, anchor: 'end', from: [162, 162] },
  대전: { x: 196, y: 184, anchor: 'start', from: [183, 181] },
  광주: { x: 132, y: 270, anchor: 'end', from: [143, 271] },
  인천: { x: 112, y: 92, anchor: 'end', from: [127, 92] },
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
  const find = (key: string) => REGIONS.find((region) => region.key === key);
  // 지도에 쓰는 글자는 칸이 좁아 한국어 이름으로 둡니다. (Gyeongsangbuk-do 같은 이름은 칸에 들어가지 않습니다)
  // 대신 화면낭독기와 설명 풍선에는 보고 있는 언어의 이름을 줍니다.
  const shortName = (key: string) => find(key)?.name.ko ?? key;
  const spokenName = (key: string) => find(key)?.name[locale as Locale] ?? shortName(key);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${MAP_SIZE.w} ${MAP_SIZE.h}`}
        role="img"
        aria-label={label}
        className="h-auto w-full max-w-[24rem]"
      >
        {/* 1)·2) 칸 */}
        {REGION_SHAPES.map((shape) => {
          const empty = (counts[shape.key] ?? 0) === 0;
          const area = (
            <path d={shape.d} className="lr-map-area" data-kind={shape.city ? 'city' : undefined} data-empty={empty} />
          );

          // 등록된 기관이 없는 지역은 눌러도 보여 줄 것이 없으므로 링크를 걸지 않습니다.
          if (empty) return <g key={shape.key}>{area}</g>;

          return (
            <Link key={shape.key} href={`/${locale}/organizations?region=${encodeURIComponent(shape.key)}`}>
              <g className="lr-map-pin">
                {/* 칸 안에 글자가 없으므로, 화면낭독기가 읽을 이름을 여기에 둡니다 */}
                <title>{spokenName(shape.key)}</title>
                {area}
              </g>
            </Link>
          );
        })}

        {/* 3) 이름 — 모든 칸 위에 */}
        <g className="lr-map-names" aria-hidden="true">
          {REGION_SHAPES.map((shape) => {
            const empty = (counts[shape.key] ?? 0) === 0;
            const fix = LABEL_FIX[shape.key];
            return (
              <g key={shape.key}>
                {fix?.from && (
                  <line
                    x1={fix.from[0]}
                    y1={fix.from[1]}
                    x2={fix.x + (fix.anchor === 'end' ? 3 : -3)}
                    y2={fix.y - 3}
                    className="lr-map-leader"
                  />
                )}
                <text
                  x={fix ? fix.x : shape.label[0]}
                  y={fix ? fix.y : shape.label[1]}
                  textAnchor={fix?.anchor ?? 'middle'}
                  className="lr-map-label"
                  data-kind={shape.city ? 'city' : undefined}
                  data-empty={empty}
                >
                  {shortName(shape.key)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </figure>
  );
}
