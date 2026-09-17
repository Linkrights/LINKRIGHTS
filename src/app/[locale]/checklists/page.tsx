// 상황별 체크리스트 목록 페이지입니다. (/ko/checklists)
// 체크리스트는 content/checklists 폴더의 파일에서 가져옵니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Notice, PageHeader, Section } from '@/components/Section';
import { getCategory, getChecklists } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  return { title: t.checklist.listTitle, description: t.checklist.listSubtitle };
}

export default async function ChecklistsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const checklists = getChecklists();

  return (
    <>
      <PageHeader title={t.checklist.listTitle} subtitle={t.checklist.listSubtitle} />
      <Section>
        <div className="mb-8 max-w-3xl">
          <Notice title={t.checklist.noticeTitle} body={t.checklist.notice} />
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {checklists.map((checklist) => {
            const body = checklist.i18n[locale] ?? checklist.i18n.ko;
            const category = getCategory(checklist.category);
            return (
              <li key={checklist.id} className="lr-card lr-card-hover group relative flex flex-col p-6">
                {category && <span className="text-sm font-semibold text-brand-700">{pick(category.name, locale)}</span>}{' '}
                <h2 className="mt-1.5 text-xl font-extrabold leading-snug text-ink-900 group-hover:text-brand-800">
                  <Link
                    href={`/${locale}/checklists/${checklist.id}`}
                    className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
                  >
                    {body.title}
                  </Link>
                </h2>{' '}
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-500">{body.summary}</p>
                <p className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-brand-700">
                  <span>{t.checklist.itemCount.replace('{n}', String(checklist.items.length))}</span>
                  <span className="inline-flex items-center gap-1">
                    {t.checklist.open} <Icon name="arrow-right" size={16} />
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
