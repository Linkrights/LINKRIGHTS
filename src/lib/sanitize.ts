// AI 답변에 "등록되지 않은 전화번호나 링크"가 들어가지 않도록 걸러내는 안전장치입니다.
//
// AI에게 규칙으로 금지했더라도, 만에 하나 지어낼 수 있으므로
// 화면에 보내기 전에 서버에서 한 번 더 확인합니다.
//
// 서버 기록(로그)에는 지운 번호·링크의 "개수"만 남깁니다.
// 사용자가 적은 연락처가 답변에 섞여 있더라도 그 값이 기록에 남지 않게 하기 위해서입니다.

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

  let removedLinks = 0;
  let removedPhones = 0;

  let result = text.replace(URL_PATTERN, (match) => {
    const host = hostOf(match);
    if (host && allow.hosts.has(host)) return match;
    removedLinks += 1;
    return '';
  });

  result = result.replace(PHONE_PATTERN, (match) => {
    // 연도(2026)나 금액처럼 보이는 4자리 숫자는 전화번호 패턴에 걸리지 않도록 이미 제한했습니다.
    if (allow.phones.has(digitsOnly(match))) return match;
    removedPhones += 1;
    return '';
  });

  if (removedLinks > 0 || removedPhones > 0) {
    console.warn(`[linkrights] 답변에서 등록되지 않은 링크 ${removedLinks}개, 전화번호 ${removedPhones}개를 제거했습니다.`);
  }

  // 번호·링크를 지운 자리에 남은 빈 괄호 "()"도 함께 지웁니다. (예: "국가인권위원회(1331)" → "국가인권위원회")
  return result
    .replace(/[(（]\s*[)）]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

export function scrubBlocks<T extends { title: string; body: string }>(blocks: T[], allow: Allowlist): T[] {
  return blocks.map((block) => ({ ...block, title: scrub(block.title, allow), body: scrub(block.body, allow) }));
}

/** 기관의 전화번호를 숫자만 남긴 모양 */
export function phoneDigits(org: Organization): string {
  return digitsOnly(org.phone);
}

/** 답변 속 언급을 찾을 때 쓸 기관 이름 조각 (예: "다누리콜센터 1577-1366" → "다누리콜센터") */
function nameParts(org: Organization): string[] {
  return Object.values(org.name)
    .filter((name): name is string => typeof name === 'string')
    .flatMap((name) => name.split(/[()]/))
    .map((part) => part.replace(/[\d\s-]+$/, '').trim())
    .filter((part) => part.length >= 4);
}

/**
 * 글에 이 기관이 언급되어 있는지 확인합니다. (등록된 이름 또는 전화번호)
 * ignorePhones: 화면에 보여주는 다른 기관과 번호가 같은 경우(예: 1388)에는 번호로 판단하지 않습니다.
 */
export function mentionsOrganization(text: string, org: Organization, ignorePhones: Set<string> = new Set()): boolean {
  if (!text) return false;
  const phone = digitsOnly(org.phone);
  if (phone && !ignorePhones.has(phone)) {
    const found = (text.match(PHONE_PATTERN) ?? []).map(digitsOnly);
    if (found.includes(phone)) return true;
  }
  return nameParts(org).some((part) => text.includes(part));
}

/**
 * 조건을 붙여 쓴 문장인지 확인합니다. (예: "같은 일이 반복된다면", "~인 경우", "If ...")
 * possible 자료(사용자가 말하지 않은 조건이 맞을 때만 관련된 자료)의 권리는 조건부 문장일 때만 보여줍니다.
 */
const CONDITIONAL_PATTERN =
  /(라면|다면|이면|으면|[가-힣]면[\s,]|경우|때는|때에는|수도 있|\bif\b|\bwhen\b|\bin case\b|\bmay\b|\bmight\b|如果|若是|的话|可能|nếu|trường hợp|\bkhi\b)/i;

export function isConditional(text: string): boolean {
  return CONDITIONAL_PATTERN.test(text);
}

/**
 * 화면에 보여주지 않는 기관(이름 또는 번호)을 말하는 문장만 뺍니다. 나머지 문장은 그대로 둡니다.
 * 근거 자료와 연결되지 않은 기관을 권리·요약·참고 문장에서 슬쩍 안내하지 않도록 하기 위한 안전장치입니다.
 */
export function dropSentencesMentioning(text: string, hidden: Organization[], ignorePhones: Set<string> = new Set()): string {
  if (!text) return '';
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .filter((sentence) => sentence.trim() && !hidden.some((org) => mentionsOrganization(sentence, org, ignorePhones)))
    .join(' ')
    .trim();
}
