// 사이트에 처음 들어왔을 때 보이는 "어떤 언어로 시작할까요?" 화면입니다.
//
// - 주소 / 로 들어오면 middleware 가 이 화면을 보여줍니다. (주소는 / 그대로입니다)
// - 언어를 고르면 /start/언어 에서 그 언어를 이 브라우저에 저장하고 첫 화면으로 갑니다.
//   다음부터는 / 로 들어와도 바로 그 언어로 열립니다.
// - 자바스크립트 없이도 동작하는 일반 링크입니다.
// - 네 가지 언어를 모두 그 언어의 글자로 보여주므로, 한국어를 모르는 사람도 자기 언어를 찾을 수 있습니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LOCALES, getMessages, localeNames, toLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'LINKRIGHTS',
  // 언어별 첫 화면이 이미 검색에 나오므로 이 화면은 검색 결과에 넣지 않습니다.
  robots: { index: false, follow: true },
};

/** 각 언어로 적은 "언어를 고르세요" (화면 언어와 상관없이 모두 보여줍니다) */
const CHOOSE: Record<string, string> = {
  ko: '언어를 고르세요',
  en: 'Choose your language',
  zh: '选择语言',
  vi: 'Chọn ngôn ngữ',
};

export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);

  return (
    <main className="lr-container flex min-h-[70vh] flex-col justify-center py-12 sm:py-16">
      <div className="mx-auto w-full max-w-xl text-center">
        <Logo className="mx-auto h-16 w-16" nameClassName="sr-only" />
        <p className="mt-6 text-sm font-semibold text-ink-500">{Object.values(CHOOSE).join(' · ')}</p>
        <h1 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-ink-900 sm:text-3xl">
          {t.welcome.title}
        </h1>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {LOCALES.map((code) => (
            <li key={code}>
              <Link
                href={`/start/${code}`}
                hrefLang={code}
                lang={code}
                className="lr-press flex h-16 w-full items-center justify-center rounded-[var(--radius-card)] border-2 border-[var(--color-line)] bg-white text-xl font-bold text-ink-900 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800"
              >
                {localeNames[code]}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[15px] leading-relaxed text-ink-500">{t.welcome.note}</p>
      </div>
    </main>
  );
}
