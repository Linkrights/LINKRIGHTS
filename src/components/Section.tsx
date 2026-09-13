// 페이지를 구성하는 기본 뼈대(제목 + 내용)입니다.
// 모든 페이지가 같은 여백·제목 크기를 쓰도록 이 부품을 사용합니다.
import type { ReactNode } from 'react';

export function Section({
  title,
  subtitle,
  eyebrow,
  action,
  children,
  tone = 'default',
  id,
}: {
  title?: string;
  subtitle?: string;
  /** 제목 위의 작은 안내 글자 */
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'soft';
  id?: string;
}) {
  return (
    <section id={id} className={tone === 'soft' ? 'bg-white' : ''}>
      <div className="lr-container lr-section">
        {(title || action) && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
            <div className="max-w-2xl">
              {eyebrow && <p className="lr-eyebrow mb-3">{eyebrow}</p>}
              {title && <h2 className="lr-h2">{title}</h2>}
              {subtitle && <p className="mt-3 text-base leading-relaxed text-ink-500 sm:text-[17px]">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  kicker,
  children,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  /** 제목 위에 넣을 이동 경로 등 */
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-line)] bg-white">
      <div className="lr-container py-10 sm:py-14">
        {children}
        {kicker && <p className="lr-eyebrow mb-3">{kicker}</p>}
        <h1 className="lr-h1 max-w-3xl">{title}</h1>
        {subtitle && <p className="lr-lead mt-4 max-w-2xl">{subtitle}</p>}
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
    <div className={`rounded-[var(--radius-control)] border px-4 py-3.5 text-[15px] ${styles}`} role="note">
      <p className="font-bold">{title}</p>
      <p className="mt-1 leading-relaxed text-ink-700">{body}</p>
    </div>
  );
}
