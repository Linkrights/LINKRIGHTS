// 실제 참여자 후기 영역입니다. content/testimonials.json 에 공개 동의를 받아 등록한 후기만 보여주고,
// 등록된 후기가 없으면 영역 전체를 그리지 않습니다. (문구를 새로 만들지 않습니다)
// 후기는 옆으로 천천히 흐르는 띠(Marquee)로 보여주며, 멈춤 버튼과 "동작 줄이기" 설정을 따릅니다.

import { Marquee } from './Marquee';
import { pick, type Locale, type Messages } from '@/lib/i18n';
import type { Testimonial } from '@/lib/types';

export function Testimonials({ items, t, locale }: { items: Testimonial[]; t: Messages; locale: Locale }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="testimonials-title" className="border-b border-[var(--color-line)] bg-white">
      <div className="lr-container py-14 sm:py-16">
        <h2 id="testimonials-title" className="lr-h2">
          {t.testimonials.title}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-[17px]">{t.testimonials.subtitle}</p>
        <div className="mt-8">
          <Marquee pauseLabel={t.common.pauseMotion} playLabel={t.common.playMotion}>
            <ul className="flex gap-10 pr-10">
              {items.map((item) => (
                <li key={item.id} className="w-[min(24rem,78vw)] shrink-0 border-l-2 border-brand-600 pl-5">
                  <figure>
                    <blockquote className="whitespace-normal text-[17px] leading-relaxed text-ink-900">
                      “{pick(item.quote, locale)}”
                    </blockquote>
                    <figcaption className="mt-3 text-sm font-semibold text-ink-500">— {pick(item.role, locale)}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </Marquee>
        </div>
      </div>
    </section>
  );
}
