'use client';

// "도움이 필요하다면"에 쓰는 지역 그림입니다.
//
// 점의 자리는 content/regions.json 에 적힌 시·도 청사 좌표를 그대로 옮긴 것이라,
// 서로의 위치 관계(위·아래·좌·우)가 실제와 같습니다. 바탕의 땅 모양은 알아보기 쉽게 단순하게 그린 그림이며,
// 정확한 행정 경계가 아닙니다. 점을 누르면 그 지역의 도움받을 곳 목록으로 갑니다.
// 등록된 기관이 없는 지역은 흐린 점으로만 두고 누를 수 없습니다.
//
// 지도 서비스(API)를 쓰지 않으므로 비용이 들지 않고, 이용자의 위치를 지도 회사에 보내지도 않습니다.

import Link from 'next/link';
import { REGIONS } from '@/lib/regions';

/** 좌표를 그림 안의 자리로 바꿉니다. (남한이 들어오는 범위) */
const BOUNDS = { minLat: 33.1, maxLat: 38.7, minLng: 125.8, maxLng: 129.8 };
const SIZE = { w: 300, h: 380 };

function place(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * SIZE.w;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * SIZE.h;
  return { x, y };
}

/**
 * 이름표가 겹치는 곳만 자리를 옮깁니다.
 * 세종과 대전은 실제로 가까워 위아래로 두면 글자가 포개집니다. 그래서 좌우로 벌립니다.
 */
const LABEL: Record<string, 'above' | 'below' | 'left' | 'right'> = {
  세종: 'left',
  대전: 'right',
  광주: 'left',
  전남: 'below',
  대구: 'right',
  울산: 'right',
  부산: 'below',
  인천: 'left',
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
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${SIZE.w} ${SIZE.h}`} role="img" aria-label={label} className="h-auto w-full max-w-[22rem]">
        {/* 땅 모양: 점들이 안쪽에 들어오도록 단순하게 그린 그림입니다. (정확한 경계가 아닙니다) */}
        <g aria-hidden="true">
          <path
            d="M150 28c18 2 32 14 44 27 13 14 26 27 34 44 9 18 14 37 18 56 4 17 9 35 5 52-4 16-17 28-30 38-13 9-28 14-44 15-16 1-32-3-48 0-17 3-32 12-49 12-16 0-33-6-42-19-9-14-7-32-4-48 3-15 7-30 5-45-2-16-9-31-7-47 2-15 11-28 21-39 10-10 22-18 32-28 11-10 20-21 33-25 11-3 22 3 32 7z"
            fill="#e3ecfb"
            stroke="#c6d8f3"
            strokeWidth="2"
          />
          {/* 제주 */}
          <ellipse cx="55" cy="352" rx="30" ry="15" fill="#e3ecfb" stroke="#c6d8f3" strokeWidth="2" />
        </g>

        {REGIONS.map((region) => {
          if (!region.center) return null;
          const { x, y } = place(region.center.lat, region.center.lng);
          const count = counts[region.key] ?? 0;
          const name = region.name.ko;
          if (count === 0) {
            return <circle key={region.key} cx={x} cy={y} r="4" fill="#b7c9e8" aria-hidden="true" />;
          }

          const where = LABEL[region.key] ?? 'above';
          const label = {
            above: { x, y: y - 14, anchor: 'middle' as const },
            below: { x, y: y + 22, anchor: 'middle' as const },
            left: { x: x - 11, y: y + 4, anchor: 'end' as const },
            right: { x: x + 11, y: y + 4, anchor: 'start' as const },
          }[where];

          return (
            <Link key={region.key} href={`/${locale}/organizations?region=${encodeURIComponent(region.key)}`}>
              <g className="lr-map-pin">
                <circle cx={x} cy={y} r="14" className="lr-map-halo" />
                <circle cx={x} cy={y} r="6.5" className="lr-map-dot" />
                <text x={label.x} y={label.y} textAnchor={label.anchor} className="lr-map-label">
                  {name}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
    </figure>
  );
}
