// 페이지를 구성하는 기본 뼈대(제목 + 내용)입니다.
import type { ReactNode } from 'react';

export function Section({
  title,
  subtitle,
  action,
  children,
  tone = 'default',
  id,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'soft';
  id?: string;
}) {
  return (
    <section id={id} className={tone === 'soft' ? 'bg-white' : ''}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {(title || action) && (
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              {title && <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>}
              {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-ink-500">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function PageHeader({ title, subtitle, kicker }: { title: string; subtitle?: string; kicker?: string }) {
  return (
    <div className="border-b border-[var(--color-line)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {kicker && <p className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-600">{kicker}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-base text-ink-700 sm:text-lg">{subtitle}</p>}
      </div>
    </div>
  );
}

/** 번역이 아직 없을 때, 오래된 정보일 때 보여주는 알림 상자 */
export function Notice({
  title,
  body,
  tone = 'info',
}: {
  title: string;
  body: string;
  tone?: 'info' | 'warn';
}) {
  const styles =
    tone === 'warn'
      ? 'border-[var(--color-warm-500)] bg-warm-100 text-ink-900'
      : 'border-brand-200 bg-brand-50 text-ink-900';
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role="note">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-ink-700">{body}</p>
    </div>
  );
}
