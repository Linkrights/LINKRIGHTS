// 질문을 어떻게 적으면 좋은지 알려주는 안내입니다. (게시판 목록과 상세 화면에서 함께 씁니다)
//
// "무엇을 적으면 되는지", "무엇을 적으면 안 되는지"를 먼저 보여주고, 바로 아래에서 질문을 보낼 수 있습니다.
// (메일 앱이 없어도 보낼 수 있게, 예전의 메일 쓰기 버튼 대신 입력칸을 둡니다. 메일 주소도 함께 안내합니다)

import { Icon } from './Icon';
import { SubmitBox } from './SubmitBox';
import { getMessages, type Locale } from '@/lib/i18n';

export function QnaGuide({ locale, className = '' }: { locale: Locale; className?: string }) {
  const t = getMessages(locale);
  const a = t.qna;

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

      {/* 질문 보내기: 사이트에서 바로 보냅니다. (운영팀이 확인하기 전까지 게시판에 보이지 않습니다) */}
      <div className="mt-6 border-t border-[var(--color-line)] pt-5">
        <h3 className="text-[15px] font-bold text-ink-900">{t.forms.questionTitle}</h3>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{t.forms.questionNote}</p>
        <div className="mt-4">
          <SubmitBox locale={locale} kind="question" />
        </div>
      </div>
    </section>
  );
}
