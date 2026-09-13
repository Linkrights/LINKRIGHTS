// 개인정보 처리방침 페이지입니다. 내용은 messages/ko.json 등의 "privacy" 부분에서 바꿉니다.

import type { Metadata } from 'next';
import { PageHeader } from '@/components/Section';
import { getSite } from '@/lib/content';
import { getMessages, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.privacy.title, description: t.privacy.subtitle };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const site = getSite();

  return (
    <>
      <PageHeader title={t.privacy.title} subtitle={t.privacy.subtitle} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <ol className="space-y-4">
          {t.privacy.sections.map((section, index) => (
            <li key={section.title} className="lr-card p-5">
              <h2 className="flex gap-3 text-lg font-extrabold text-ink-900">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm text-white">
                  {index + 1}
                  <span className="sr-only">.</span>
                </span>{' '}
                {section.title}
              </h2>
              <p className="mt-2 pl-10 text-[15px] leading-relaxed text-ink-700">{section.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm text-ink-500">
          {t.footer.contact}:{' '}
          <a className="lr-link" href={`mailto:${site.contactEmail}`}>
            {site.contactEmail}
          </a>
        </p>
      </div>
    </>
  );
}
