// AI 답변에 "등록되지 않은 전화번호나 링크"가 들어가지 않도록 걸러내는 안전장치입니다.
//
// AI에게 규칙으로 금지했더라도, 만에 하나 지어낼 수 있으므로
// 화면에 보내기 전에 서버에서 한 번 더 확인합니다.

import type { Organization, RightsArticle } from './types';

/**
 * 전화번호처럼 보이는 문자열 (02-123-4567, 1577-1366, 1350, 112 등)
 * 뒤에 "년", "원", "명" 같은 단위가 붙으면 전화번호가 아니므로 제외합니다.
 */
const UNIT_GUARD = '(?![\\d년원명개월일차호분초시%])';
const PHONE_PATTERN = new RegExp(
  `\\d{2,4}-\\d{3,4}(?:-\\d{4})?${UNIT_GUARD}|\\b1\\d{3}\\b${UNIT_GUARD}|\\b1(?:1[2789])\\b${UNIT_GUARD}`,
  'g',
);
const URL_PATTERN = /https?:\/\/[^\s)"'<>]+|(?:www\.)[^\s)"'<>]+/gi;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function hostOf(value: string): string {
  try {
    const url = value.startsWith('http') ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export interface Allowlist {
  phones: Set<string>;
  hosts: Set<string>;
}

/** 등록된 기관과 권리정보 출처에서 "허용되는 번호와 주소" 목록을 만듭니다. */
export function buildAllowlist(organizations: Organization[], articles: RightsArticle[]): Allowlist {
  const phones = new Set<string>();
  const hosts = new Set<string>();

  for (const org of organizations) {
    if (org.phone) phones.add(digitsOnly(org.phone));
    if (org.website) {
      const host = hostOf(org.website);
      if (host) hosts.add(host);
    }
    const sourceHost = hostOf(org.source_url);
    if (sourceHost) hosts.add(sourceHost);
  }

  for (const article of articles) {
    for (const source of article.sources ?? []) {
      const host = hostOf(source.url);
      if (host) hosts.add(host);
    }
  }

  return { phones, hosts };
}

/** 허용 목록에 없는 전화번호와 링크를 지웁니다. 문장은 그대로 두고 번호만 제거합니다. */
export function scrub(text: string, allow: Allowlist): string {
  if (!text) return '';

  let result = text.replace(URL_PATTERN, (match) => {
    const host = hostOf(match);
    if (host && allow.hosts.has(host)) return match;
    console.warn('[linkrights] 등록되지 않은 링크를 답변에서 제거했습니다:', match);
    return '';
  });

  result = result.replace(PHONE_PATTERN, (match) => {
    const digits = digitsOnly(match);
    // 연도(2026)나 금액처럼 보이는 4자리 숫자는 전화번호 패턴에 걸리지 않도록 이미 제한했습니다.
    if (allow.phones.has(digits)) return match;
    console.warn('[linkrights] 등록되지 않은 전화번호를 답변에서 제거했습니다:', match);
    return '';
  });

  return result.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

export function scrubBlocks<T extends { title: string; body: string }>(blocks: T[], allow: Allowlist): T[] {
  return blocks.map((block) => ({ ...block, title: scrub(block.title, allow), body: scrub(block.body, allow) }));
}
