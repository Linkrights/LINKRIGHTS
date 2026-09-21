// 언어별 문구를 꺼내고 날짜를 보기 좋게 바꾸는 작은 도구입니다.
// 문구 파일(messages/*.json)을 불러오지 않으므로, 브라우저에서 그리는 부품(예: 도움받을 곳 카드)이 써도
// 4개 언어 문구 전체가 함께 내려받아지지 않습니다. (i18n.ts 도 같은 함수를 그대로 다시 내보냅니다)

import type { Locale, LocalizedText } from './types';

/**
 * 언어별 문자열에서 원하는 언어를 꺼냅니다.
 * 해당 언어가 없으면 한국어를 대신 보여줍니다.
 */
export function pick(text: LocalizedText | Partial<Record<Locale, string>> | undefined, locale: Locale): string {
  if (!text) return '';
  return text[locale] ?? text.ko ?? '';
}

/** 2026-09-06 을 화면에 보기 좋게 바꿉니다. */
export function formatDate(value: string, locale: Locale): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const tag = locale === 'zh' ? 'zh-CN' : locale === 'vi' ? 'vi-VN' : locale === 'en' ? 'en-GB' : 'ko-KR';
  return new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}
