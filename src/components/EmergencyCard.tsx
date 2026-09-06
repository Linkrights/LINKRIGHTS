// 긴급 안내 카드입니다. 일반 답변과 확실히 구분되도록 붉은 계열로 표시합니다.
// 여기에 들어가는 글과 번호는 content/emergency.json + content/organizations.json 에서만 옵니다.

import { Icon } from './Icon';
import { getMessages, pick, type Locale } from '@/lib/i18n';
import type { Organization } from '@/lib/types';

export function EmergencyCard({
  locale,
  title,
  message,
  steps,
  note,
  organizations,
}: {
  locale: Locale;
  title: string;
  message: string;
  steps: string[];
  note: string;
  organizations: Organization[];
}) {
  const t = getMessages(locale);

  return (
    <section
      role="alert"
      className="rounded-2xl border-2 border-[var(--color-danger-200)] bg-[var(--color-danger-50)] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-danger-600)] text-white">
          <Icon name="alert" size={22} />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-[var(--color-danger-700)] sm:text-2xl">{title}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-900">{message}</p>
        </div>
      </div>

      {organizations.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {organizations.map((org) => (
            <li key={org.id}>
              <a
                href={`tel:${org.phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-danger-200)] bg-white px-4 py-3 transition-colors hover:bg-[var(--color-danger-50)]"
              >
                <Icon name="phone" size={18} className="text-[var(--color-danger-600)]" />
                <span className="flex-1">
                  <span className="block text-lg font-extrabold text-[var(--color-danger-700)]">{org.phone}</span>
                  <span className="block text-sm text-ink-700">{pick(org.name, locale)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {steps?.length > 0 && (
        <ol className="mt-5 space-y-2.5">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-900">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {note && <p className="mt-5 text-sm leading-relaxed text-ink-500">{note}</p>}
      <p className="sr-only">{t.emergency.pageSubtitle}</p>
    </section>
  );
}
