// 한국어가 아닌 화면의 첫 화면 배너입니다.
//
// 왜 따로 있나요?
//   팀에서 만든 사진에는 제목·안내문·검색창·추천 검색어가 **한국어로 그려져** 있습니다.
//   그래서 한국어 화면은 사진을 통째로 쓰고 그 위에 진짜 입력칸만 포갭니다. (HeroBannerSearch)
//   다른 언어 화면은 사진에서 **사람과 도시만** 오른쪽에 붙이고, 나머지는 그 언어 글자로 그립니다.
//   모습은 한국어 배너와 같게 맞췄습니다. 글자 자리도 사진의 픽셀을 재서 같은 비율에 놓았습니다.
//
// 자리 (사진 1989×791 에서 잰 값)
//   제목 x 105, y 95~270   안내문 y 310~400   검색창 x 105~1190, y 453~577   추천 검색어 y 618~681
//   하늘색 b7e0fe → c6e7fe → d2ecff, 제목 글자색은 사진에서 가장 진한 남색
//
// 글자 크기는 cqw(칸 너비의 %)로 두어, 배너가 커지든 작아지든 사진과 같은 비율을 지킵니다.

import { HERO_CROP_RATIO, HeroPicture } from './art/HeroPicture';
import { HeroBannerSearch, type HeroBannerLabels } from './HeroBannerSearch';

export interface HeroBannerTextLabels extends HeroBannerLabels {
  /** 배너 안 큰 제목 (줄바꿈 포함) */
  headline: string;
  /** 배너 안 설명 (줄바꿈 포함) */
  sub: string;
  /** 추천 검색어 앞에 붙는 말 */
  chipsLabel: string;
}

const BOX = { w: 1989, h: 791 };
const pct = (value: number, total: number) => `${(value / total) * 100}%`;

export function HeroBannerText({ locale, labels }: { locale: string; labels: HeroBannerTextLabels }) {
  return (
    <div className="lr-hero-pic lr-hero-banner" style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}>
      {/* 하늘 — 사진 왼쪽 하늘색을 그대로 이어서 */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#b7e0fe 0%,#c6e7fe 55%,#d2ecff 100%)' }} />

      {/* 오른쪽에 사람과 도시. 칸 너비를 잘라 쓸 범위와 같은 비율로 두어 사진이 늘어나지 않습니다.
          왼쪽 끝은 서서히 사라지게 해서, 사진의 하늘과 위에 깐 하늘색이 만나는 자리에 선이 보이지 않게 합니다. */}
      <div className="lr-hero-banner-pic absolute inset-y-0 right-0" style={{ width: `${HERO_CROP_RATIO * 100}%` }}>
        {/* uid: 좁은 화면용 그림(HomeTop)과 id 가 겹치면 덮개가 안 그려집니다 */}
        <HeroPicture variant="crop" fill priority uid="banner" />
      </div>

      <h2
        className="lr-hero-headline absolute whitespace-pre-line"
        style={{ left: pct(105, BOX.w), top: pct(86, BOX.h), width: pct(1150, BOX.w) }}
      >
        {labels.headline}
      </h2>
      <p
        className="lr-hero-sub absolute whitespace-pre-line"
        style={{ left: pct(105, BOX.w), top: pct(300, BOX.h), width: pct(1150, BOX.w) }}
      >
        {labels.sub}
      </p>
      {/* 검색창은 한국어 배너와 같은 부품을 같은 자리에 씁니다.
          추천 검색어는 글자 길이가 언어마다 달라 못박지 않고 줄지어 놓습니다. (flow) */}
      <HeroBannerSearch locale={locale} labels={labels} flow />
    </div>
  );
}
