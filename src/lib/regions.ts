// 지역(시·도) 목록과 기관의 이용 지역을 다루는 함수입니다. (content/regions.json)
// 파일을 직접 읽지 않고 JSON 을 불러오므로 서버와 브라우저 양쪽에서 쓸 수 있습니다.
//
// 기관의 이용 지역 판단
//  - nationwide 가 있으면 그 값을, 없으면 region 이 "전국"인지로 전국 기관인지 정합니다.
//  - regions 가 있으면 그 목록을, 없으면 region(전국이 아닐 때) 하나를 이용 지역으로 봅니다.
// 지역을 고르면 "그 지역 기관 + 전국 기관"만 보여줍니다.

import regionsFile from '../../content/regions.json';
import type { LocalizedText, Locale, Organization } from './types';

export const NATIONWIDE = '전국';

export interface RegionItem {
  /** organizations.json 의 region / regions 에 적는 값 (한국어 시·도 이름) */
  key: string;
  name: LocalizedText;
  /**
   * 시·도의 대표 좌표입니다. (시·도 청사 기준, 대략)
   * "내 주변 기관 찾기"에서 브라우저가 알려준 위치와 비교해 가장 가까운 시·도를 고르는 데에만 씁니다.
   * 좌표를 서버로 보내거나 저장하지 않고, 거리도 보여주지 않습니다.
   */
  center?: { lat: number; lng: number };
}

/**
 * 어느 시·도에 가장 가까운지 고릅니다. (브라우저 안에서만 계산합니다)
 *
 * 시·도 청사 자리에서 가장 가까운 한 곳을 고르는 간단한 방법입니다.
 * 서울을 둘러싼 경기 북부(고양·의정부 등)처럼 경계가 복잡한 곳은 옆 시·도가 나올 수 있습니다.
 * 그래서 화면(NearbyRegion.tsx)에서 "여기 맞나요?" 하고 한 번 더 묻고, 직접 고를 수도 있게 합니다.
 * 정확한 경계로 판단하려면 시·도 경계 자료가 필요한데, 그만한 정확도가 필요한 기능이 아닙니다.
 */
export function nearestRegion(lat: number, lng: number): RegionItem | null {
  let best: RegionItem | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const region of REGIONS) {
    if (!region.center) continue;
    // 위도 1도와 경도 1도의 실제 거리가 달라, 경도 쪽을 위도에 맞춰 줄입니다.
    const dy = region.center.lat - lat;
    const dx = (region.center.lng - lng) * Math.cos((lat * Math.PI) / 180);
    const score = dy * dy + dx * dx;
    if (score < bestScore) {
      bestScore = score;
      best = region;
    }
  }
  return best;
}

export const REGIONS: RegionItem[] = (regionsFile as { regions: RegionItem[] }).regions;

export function regionName(key: string, locale: Locale): string {
  if (key === NATIONWIDE) return key;
  const region = REGIONS.find((item) => item.key === key);
  return region ? (region.name[locale] ?? region.name.ko) : key;
}

/**
 * 질문 글에 등록된 시·도 이름이 들어 있으면 그 지역을 찾아 줍니다. (예: "울산에서 한국어 교육" → 울산)
 * content/regions.json 에 등록된 이름(4개 언어)만 찾고, 없는 지역을 만들어내지 않습니다.
 * "서울시", "경기도"처럼 뒤에 글자가 붙어도 찾을 수 있게 등록된 이름이 들어 있는지로만 봅니다.
 */
export function findRegionInText(text: string): RegionItem | null {
  const haystack = text.toLowerCase();
  let found: { region: RegionItem; length: number } | null = null;
  for (const region of REGIONS) {
    for (const name of Object.values(region.name)) {
      const needle = (name ?? '').toLowerCase();
      // 두 글자 미만의 이름은 다른 낱말에 섞일 수 있어 찾지 않습니다.
      if (needle.length < 2 || !haystack.includes(needle)) continue;
      // 이름이 더 긴 지역을 우선합니다. ("경기"보다 "경기도")
      if (!found || needle.length > found.length) found = { region, length: needle.length };
    }
  }
  return found?.region ?? null;
}

export interface OrganizationArea {
  nationwide: boolean;
  regions: string[];
}

export function organizationArea(org: Pick<Organization, 'region' | 'nationwide' | 'regions'>): OrganizationArea {
  const nationwide = org.nationwide ?? org.region === NATIONWIDE;
  const regions = org.regions ?? (org.region && org.region !== NATIONWIDE ? [org.region] : []);
  return { nationwide, regions };
}

/** 지역을 골랐을 때 이 기관을 보여줄지 (지역을 고르지 않았으면 모두 보여줍니다) */
export function servesRegion(area: OrganizationArea, region: string | null): boolean {
  return !region || area.nationwide || area.regions.includes(region);
}
