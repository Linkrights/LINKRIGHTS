// "전화하기 전에 이렇게 말해보세요" 안내입니다. 기관에 처음 전화하는 것이 어려운 청소년을 위한 참고용 예시 문장입니다.
// - 기관 상담을 대신하지 않으며, 실제 절차는 기관의 안내를 따르도록 함께 적습니다.
// - 이름·연락처 같은 개인정보를 적는 칸은 없습니다.
// - 긴급 상황(112·119)은 이 안내 대신 바로 전화하도록 안내합니다.
// 자바스크립트 없이 열고 닫히는 <details> 로 만들었습니다.

import { Icon } from './Icon';
import type { Messages } from '@/lib/i18n';

export function CallScript({ t, topic, className = '' }: { t: Messages; topic?: string; className?: string }) {
  const c = t.callScript;
  const lines = [topic ? c.line1Topic.replace('{topic}', topic) : c.line1, c.line2, c.line3];

  return (
    <details className={`group rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-bold text-ink-900 hover:bg-surface-soft [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <Icon name="phone" size={18} className="shrink-0 text-brand-600" />
          {c.title}
        </span>
        <span className="shrink-0 text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="border-t border-[var(--color-line)] px-5 pb-5 pt-4">
        <p className="text-[15px] leading-relaxed text-ink-700">{c.intro}</p>
        <ol className="mt-4 space-y-2.5">
          {lines.map((line, index) => (
            <li
              key={index}
              className="flex gap-3 rounded-[var(--radius-control)] bg-surface-soft px-4 py-3 text-[15px] leading-relaxed text-ink-900"
            >
              <span className="shrink-0 font-bold tabular-nums text-brand-600">
                {index + 1}
                <span className="sr-only">.</span>
              </span>{' '}
              <span>“{line}”</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm font-bold text-ink-900">{c.tipsTitle}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-700">
          <li>{c.tip1}</li>
          <li>{c.tip2}</li>
          <li>{c.tip3}</li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-ink-500">{c.note}</p>
      </div>
    </details>
  );
}
