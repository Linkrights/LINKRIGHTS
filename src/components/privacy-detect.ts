// 질문 입력창에 개인정보로 보이는 글자가 들어 있는지 확인합니다. (브라우저에서만 사용)
//
// 목적: 사용자가 실수로 주민등록번호·전화번호 같은 정보를 적어 보내는 것을 줄이기 위한 "간단한 확인"입니다.
// 모든 개인정보를 찾아내는 완전한 검사가 아니며(이름·주소 등은 찾지 않습니다), 서버(/api/ask)의 처리와는 관계가 없습니다.
// 찾은 내용은 어디에도 저장하거나 보내지 않고, 화면 안내에만 씁니다.

export type PersonalInfoType = 'id' | 'phone' | 'email' | 'passport' | 'account';

export interface PersonalInfoMatch {
  type: PersonalInfoType;
  start: number;
  end: number;
}

/**
 * [종류, 규칙]. 규칙의 첫 번째 괄호는 앞 글자(경계), 두 번째 괄호가 찾을 내용입니다.
 * 앞에 있는 규칙이 우선합니다. (예: 010-1234-5678 은 계좌번호가 아니라 전화번호로 봅니다)
 * 오래된 휴대폰 브라우저에서도 동작하도록 뒤를 돌아보는 정규식(lookbehind)은 쓰지 않습니다.
 */
const PATTERNS: [PersonalInfoType, RegExp][] = [
  ['email', /()([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g],
  // 주민등록번호·외국인등록번호: 앞 6자리 + 뒤 7자리 (뒤 첫 자리 1~8)
  ['id', /(^|\D)(\d{6}\s?-?\s?[1-8]\d{6})(?!\d)/g],
  // 휴대폰: 010-1234-5678, 01012345678, +82 10-1234-5678
  ['phone', /(^|\D)((?:\+?82[-.\s]?1[016789]|01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4})(?!\d)/g],
  // 지역번호가 있는 일반 전화: 02-123-4567, 031-123-4567
  ['phone', /(^|\D)(0(?:2|[3-6][1-5])[-.)\s]\s?\d{3,4}[-.\s]\d{4})(?!\d)/g],
  // 카드번호: 1234-5678-9012-3456, 15~16자리 숫자
  ['account', /(^|\D)(\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{3,4}|\d{15,16})(?!\d)/g],
  // 계좌번호: 110-123-456789 처럼 하이픈으로 나뉜 숫자 (날짜 2026-09-14 는 마지막 자리가 짧아 제외)
  ['account', /(^|\D)(\d{3,6}-\d{2,6}-\d{4,7}(?:-\d{1,3})?)(?!\d)/g],
  // 여권번호: M12345678 처럼 대문자 1~2개 + 숫자 7~8자리
  ['passport', /(^|[^A-Za-z0-9])([A-Z]{1,2}\d{7,8})(?![A-Za-z0-9])/g],
];

/** 개인정보로 보이는 부분을 찾아 앞에서부터 순서대로 돌려줍니다. */
export function findPersonalInfo(text: string): PersonalInfoMatch[] {
  if (!text) return [];
  const accepted: PersonalInfoMatch[] = [];
  for (const [type, pattern] of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const start = (match.index ?? 0) + match[1].length;
      const end = start + match[2].length;
      if (accepted.some((other) => start < other.end && other.start < end)) continue;
      accepted.push({ type, start, end });
    }
  }
  return accepted.sort((a, b) => a.start - b.start);
}

/** 찾은 부분을 지운 글을 돌려줍니다. (지운 자리에 생긴 겹친 띄어쓰기는 하나로 줄입니다) */
export function removePersonalInfo(text: string, matches = findPersonalInfo(text)): string {
  let result = '';
  let cursor = 0;
  for (const match of matches) {
    result += text.slice(cursor, match.start);
    cursor = match.end;
  }
  result += text.slice(cursor);
  return result.replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
}
