// 다국어(여러 언어) 처리를 담당하는 파일입니다.
// 화면에 보이는 짧은 문구는 messages 폴더의 ko.json / en.json / zh.json / vi.json 에 있습니다.

import ko from '../../messages/ko.json';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';
import vi from '../../messages/vi.json';
import { LOCALES, DEFAULT_LOCALE, type Locale, type LocalizedText } from './types';

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };

/** ko.json 을 기준으로 문구의 모양을 정합니다. */
export type Messages = typeof ko;

const dictionaries: Record<Locale, Messages> = {
  ko: ko as Messages,
  en: en as Messages,
  zh: zh as Messages,
  vi: vi as Messages,
};

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  vi: 'Tiếng Việt',
};

/** <html lang="..."> 에 넣을 값 */
export const htmlLang: Record<Locale, string> = {
  ko: 'ko',
  en: 'en',
  zh: 'zh-Hans',
  vi: 'vi',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * 주소에서 읽은 언어 값을 안전한 언어 값으로 바꿔줍니다.
 * 지원하지 않는 값이 들어오면 한국어로 처리합니다.
 */
export function toLocale(value: string): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

// 언어별 문구 꺼내기(pick)와 날짜 표시(formatDate)는 문구 파일을 불러오지 않는 localize.ts 에 있습니다.
export { pick, formatDate } from './localize';

/** 번역이 없어서 한국어로 대체되는 상황인지 알려줍니다. */
export function isFallback(
  text: LocalizedText | Partial<Record<Locale, string>> | undefined,
  locale: Locale,
): boolean {
  if (!text) return false;
  if (locale === 'ko') return false;
  return !text[locale];
}

/** /ko/rights 처럼 언어가 포함된 주소를 만들어 줍니다. */
export function localePath(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/+/, '');
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}
