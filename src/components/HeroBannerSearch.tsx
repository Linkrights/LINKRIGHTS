// 첫 화면 사진 안에 **그려져 있는** 검색창과 추천 검색어를, 진짜 눌리는 것으로 덮어씁니다.
//
// 왜 덮어쓰나요?
//   사진 속 검색창은 그림일 뿐이라 눌러도 아무 일이 없습니다. 그 자리에 똑같이 생긴 진짜 입력칸을
//   정확히 포개 두면, 보기에는 사진 그대로인데 실제로 쓸 수 있습니다.
//
// 자리를 어떻게 맞췄나요?
//   사진(1989×791)의 픽셀을 읽어서 그려진 검색창과 알약의 네모를 찾아 백분율로 바꿨습니다.
//   틀의 가로세로 비율을 사진과 같게 잡아 두었으므로, 화면이 넓어지거나 좁아져도 그대로 포개집니다.
//     검색창  x 105~1190, y 453~577      파란 단추  가운데 (1140, 515), 지름 100
//     추천 검색어  y 618~681 / 첫째 247~538 · 둘째 556~895 · 셋째 913~1162
//
// 글자는 사진에 그려진 것과 같은 한국어입니다. (이 덮개는 한국어 화면에서만 씁니다.
//  다른 언어 화면은 사진에서 한국어가 없는 쪽만 잘라 쓰고, 검색창을 따로 그립니다.)
// 보내는 곳은 AI 질문 화면입니다. 거기에 개인정보를 적지 말라는 안내와 예시가 함께 있습니다.

import Link from 'next/link';
import { HeroPicture } from './art/HeroPicture';
import { Icon } from './Icon';

const BOX = { w: 1989, h: 791 };
const pct = (value: number, total: number) => `${(value / total) * 100}%`;

const BAR = { x: 105, y: 453, w: 1190 - 105, h: 577 - 453 };
const BUTTON = { d: 100, cx: 1140, cy: 515 };
const CHIPS_Y = { y: 618, h: 681 - 618 };
const CHIPS_X = [
  { x: 247, w: 538 - 247 },
  { x: 556, w: 895 - 556 },
  { x: 913, w: 1162 - 913 },
];

export interface HeroBannerLabels {
  /** 검색창 안내문 (사진에 그려진 것과 같게) */
  placeholder: string;
  /** 검색 단추를 설명하는 말 (화면낭독기용) */
  submit: string;
  /** 추천 검색어 세 개 */
  chips: string[];
  /** 추천 검색어 앞에 붙는 말. 한국어는 사진에 그려져 있어 쓰지 않습니다. */
  chipsLabel?: string;
}

/**
 * 한국어 배너: 사진을 통째로 깔고 그 위에 진짜 검색창을 포갭니다.
 * (다른 언어 배너는 HeroBannerText 가 같은 부품을 같은 자리에 씁니다)
 */
export function HeroBannerKorean({ locale, labels }: { locale: string; labels: HeroBannerLabels }) {
  return (
    <div className="lr-hero-banner relative">
      <HeroPicture variant="full" priority />
      <HeroBannerSearch locale={locale} labels={labels} />
    </div>
  );
}

export function HeroBannerSearch({
  locale,
  labels,
  flow = false,
}: {
  locale: string;
  labels: HeroBannerLabels;
  /**
   * 추천 검색어를 줄지어 놓습니다. (한국어가 아닌 배너)
   *
   * 한국어는 사진에 그려진 알약 위에 정확히 포개야 해서 알약마다 자리를 못박아 둡니다.
   * 다른 언어는 글자 길이가 달라 그 자리에 못박으면 서로 겹칩니다.
   * (영어 "What if I cannot speak Korean?" 는 한국어 알약보다 훨씬 깁니다)
   */
  flow?: boolean;
}) {
  return (
    <>
      <form
        action={`/${locale}/ask`}
        method="get"
        className="lr-hero-bar"
        style={{
          left: pct(BAR.x, BOX.w),
          top: pct(BAR.y, BOX.h),
          width: pct(BAR.w, BOX.w),
          height: pct(BAR.h, BOX.h),
        }}
      >
        <Icon name="search" size={22} className="lr-hero-bar-icon" aria-hidden="true" />
        <input
          type="search"
          name="q"
          maxLength={500}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="lr-hero-bar-input"
        />
        <button
          type="submit"
          aria-label={labels.submit}
          className="lr-hero-bar-go"
          style={{
            width: pct(BUTTON.d, BAR.w),
            right: pct(BAR.x + BAR.w - BUTTON.cx - BUTTON.d / 2, BAR.w),
          }}
        >
          <Icon name="search" size={20} aria-hidden="true" />
        </button>
      </form>

      <div
        className={`lr-hero-chips ${flow ? 'lr-hero-chips-flow' : ''}`}
        style={{ top: pct(CHIPS_Y.y, BOX.h), height: pct(CHIPS_Y.h, BOX.h) }}
      >
        {flow && labels.chipsLabel && <span className="lr-hero-chips-label">{labels.chipsLabel}</span>}
        {labels.chips.slice(0, 3).map((chip, i) => (
          <Link
            key={chip}
            href={`/${locale}/ask?q=${encodeURIComponent(chip)}`}
            className="lr-hero-chip"
            style={flow ? undefined : { left: pct(CHIPS_X[i].x, BOX.w), minWidth: pct(CHIPS_X[i].w, BOX.w) }}
          >
            {chip}
          </Link>
        ))}
      </div>
    </>
  );
}
