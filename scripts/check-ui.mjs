// 화면 점검: 주요 화면이 열리는지, 첫 화면 구성이 깨지지 않았는지 봅니다.
//
// 쓰는 법
//   개발 서버를 띄운 뒤:  node scripts/check-ui.mjs http://localhost:3120
//   운영 사이트 확인:     node scripts/check-ui.mjs https://linkrights.org
//
// 왜 저장소 안에 두나요?
//   전에는 임시 폴더에 두었는데 윈도우가 정리해 버려서 매번 다시 만들어야 했습니다.
//   여기 두면 남아 있고, 팀에서도 똑같이 돌려볼 수 있습니다.

const base = (process.argv[2] ?? 'http://localhost:3120').replace(/\/$/, '');
const get = async (path) => {
  const res = await fetch(base + path, { headers: { 'Cache-Control': 'no-cache' } });
  return { status: res.status, html: await res.text() };
};

let failed = 0;
const ok = (name, value, detail = '') => {
  if (!value) failed++;
  console.log(`${value ? 'OK  ' : '실패'} ${name}${detail ? ' — ' + detail : ''}`);
};

const LOCALES = ['ko', 'en', 'zh', 'vi'];
const AI_NAME = { ko: '링라', en: 'Lingra', zh: 'Lingra', vi: 'Lingra' };

console.log('=== 화면이 열리는지 ===');
const page = {};
for (const path of [
  '/', ...LOCALES.map((l) => `/${l}`),
  '/ko/rights', '/ko/organizations', '/ko/programs', '/ko/checklists',
  '/ko/ask', '/ko/qna', '/ko/community', '/ko/faq', '/ko/about',
  '/ko/get-involved', '/ko/emergency', '/ko/privacy', '/ko/saved',
  '/en/ask', '/zh/faq', '/vi/organizations',
]) {
  const r = await get(path);
  page[path] = r.html;
  ok(path, r.status === 200, String(r.status));
}

console.log('\n=== AI 이름(링라) ===');
for (const l of LOCALES) {
  const name = AI_NAME[l];
  ok(`${l}: 첫 화면에 이름`, page[`/${l}`].includes(name));
}
ok('ko: 묻는 단추가 이름으로', page['/ko'].includes('링라에게 물어보기'));
ok('ko: 이름 옆에 "AI 안내"', page['/ko'].includes('AI 안내'));
ok('en: 묻는 단추가 이름으로', page['/en'].includes('Ask Lingra'));

console.log('\n=== 첫 화면 (영상 + 제목 + 검색창) ===');
for (const l of LOCALES) {
  const h = page[`/${l}`];
  // 사진 배너는 걷어 냈습니다. 그림이 두 겹이 되어 영상과 겹쳤습니다.
  ok(`${l}: 사진 배너가 없다`, !h.includes('lr-hero-banner') && !h.includes('/hero-main.webp'));
  ok(`${l}: 검색창 하나만`, (h.match(/id="hero-question"/g) ?? []).length === 1);
  ok(`${l}: 제목이 글자로 있다`, h.includes('home-hero-title'));
  const ids = [...h.matchAll(/id="(lr-hero-[^"]+)"/g)].map((m) => m[1]);
  ok(`${l}: 그림 id 안 겹침`, new Set(ids).size === ids.length);
}

console.log('\n=== 스크롤 등장 (색 띠가 통째로 움직이면 안 됨) ===');
for (const l of LOCALES) ok(`${l}`, !/data-reveal=""[^>]*>\s*<section/.test(page[`/${l}`]));

console.log('\n=== 지도 ===');
const areas = (page['/ko'].match(/class="lr-map-area"/g) ?? []).length;
ok('17개 시·도', areas === 17, `${areas}개`);
const regions = new Set([...page['/ko'].matchAll(/organizations\?region=([^"&]+)/g)].map((m) => m[1]));
ok('지역 링크 17곳', regions.size >= 17, `${regions.size}곳`);

console.log('\n=== 배경 영상 ===');
// <video> 는 창이 다 뜬 뒤에 자바스크립트가 답니다 (첫 화면을 느리게 만들지 않으려고).
// 그래서 서버가 보낸 글에는 없는 게 정상이고, 대신 아래 것들이 있어야 합니다.
const videoFile = (await fetch(base + '/videos/linkrights-theme.mp4')).status;
const ko = page['/ko'];
const hasPoster = ko.includes('linkrights-theme-poster.jpg');
const hasSource = ko.includes('linkrights-theme.mp4');
if (videoFile === 200) {
  ok('대표 그림이 먼저 깔린다', hasPoster);
  ok('재생·멈춤 단추가 있다', /aria-label="[^"]*(재생|멈춤)[^"]*"/.test(ko));
  ok('영상 주소를 넘겨 준다', hasSource);
  ok('처음엔 video 태그를 안 단다', (ko.match(/<video/g) ?? []).length === 0);
} else {
  ok('영상이 없으면 아무것도 안 나온다', !hasPoster && !hasSource, `파일 ${videoFile}`);
}

console.log('\n=== 흔한 사고 ===');
const all = Object.values(page).join('');
ok('undefined 가 안 찍힘', !all.includes('undefined<'));
ok('NaN 이 안 찍힘', !/>\s*NaN\s*</.test(all));
ok('[object Object] 가 안 찍힘', !all.includes('[object Object]'));

console.log(failed ? `\n실패 ${failed}개` : '\n모두 통과');
process.exit(failed ? 1 : 0);
