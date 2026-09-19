// 질문을 어떻게 적으면 좋은지 알려주는 안내입니다. (게시판 목록과 상세 화면에서 함께 씁니다)
//
// 질문은 사이트에 바로 저장되지 않고 이메일로 운영팀에 전달됩니다.
// 그래서 "무엇을 적으면 되는지", "무엇을 적으면 안 되는지"를 버튼 옆에서 먼저 보여줍니다.

import { Icon } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

export function QnaGuide({
  locale,
  contactEmail,
  className = '',
}: {
  locale: Locale;
  contactEmail: string;
  className?: string;
}) {
  const t = getMessages(locale);
  const a = t.qna;
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(a.mailSubject)}&body=${encodeURIComponent(
    a.mailBody,
  )}`;

  return (
    <section className={`lr-card p-5 sm:p-6 ${className}`}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-900">
        <Icon name="message" size={20} className="text-brand-600" /> {a.guideTitle}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{a.guideIntro}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-[15px] font-bold text-ink-900">{a.guideWriteTitle}</h3>
          <ul className="mt-2 space-y-1.5">
            {a.guideWrite.map((line) => (
              <li key={line} className="flex gap-2 text-[15px] leading-relaxed text-ink-700">
                <Icon name="check" size={16} className="mt-1 shrink-0 text-brand-600" /> <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--radius-control)] border border-[var(--color-warm-500)] bg-warm-100 p-4">
          <h3 className="text-[15px] font-bold text-ink-900">{a.guideAvoidTitle}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{a.guideAvoid}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-start gap-2">
        <a href={mailto} className="lr-btn lr-btn-primary lr-press">
          {a.sendCta} <Icon name="arrow-right" size={18} />
        </a>
        <p className="text-[13px] leading-relaxed text-ink-500">{a.sendNote.replace('{email}', contactEmail)}</p>
      </div>
    </section>
  );
}
