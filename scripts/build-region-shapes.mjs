// 시·도 경계 자료(GeoJSON)를 첫 화면 지도용 SVG 경로로 바꿔 src/lib/regionShapes.ts 를 만듭니다.
//
// 자료: geoBoundaries gbOpen KOR ADM1 (simplified) — 저작권 없음(Public Domain)
//   https://www.geoboundaries.org/  /  https://github.com/wmgeolab/geoBoundaries
//   받는 곳: releaseData/gbOpen/KOR/ADM1/geoBoundaries-KOR-ADM1_simplified.geojson
//
// 왜 미리 만들어 두나요?
//   - 지도 서비스(API)를 쓰지 않으므로 비용이 들지 않고, 이용자의 위치를 지도 회사에 보내지 않습니다.
//   - 화면에서는 320px 남짓으로 그리므로, 그 크기에서 보이지 않는 점은 미리 덜어내 파일을 가볍게 합니다.
//
// 쓰는 법:  node scripts/build-region-shapes.mjs <내려받은.geojson>

import fs from 'node:fs';
import path from 'node:path';

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error('쓰는 법: node scripts/build-region-shapes.mjs <geoBoundaries-KOR-ADM1_simplified.geojson>');
  process.exit(1);
}

/** 자료의 영어 이름 → content/regions.json 의 key */
const NAMES = {
  Seoul: '서울',
  Busan: '부산',
  Daegu: '대구',
  Incheon: '인천',
  Gwangju: '광주',
  Daejeon: '대전',
  Ulsan: '울산',
  Sejong: '세종',
  Gyeonggi: '경기',
  Gangwon: '강원',
  'North Chungcheong': '충북',
  'South Chungcheong': '충남',
  'North Jeolla': '전북',
  'South Jeolla': '전남',
  'North Gyeongsang': '경북',
  'South Gyeongsang': '경남',
  Jeju: '제주',
};

/** 광역시는 도 안에 들어앉아 있어 나중에 그려야 합니다. */
const CITIES = new Set(['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종']);

// 울릉도·독도처럼 멀리 떨어진 섬까지 넣으면 본토가 작아집니다. 이 창 밖은 버립니다.
const WINDOW = { minLng: 124.5, maxLng: 130.2, minLat: 32.9, maxLat: 38.8 };
// 화면에서 이만큼도 안 되는 섬은 점 하나로만 보여 오히려 지저분합니다. (그린 크기 기준 제곱 px)
const MIN_AREA = 1.6;
// 이만큼 안쪽으로 들어온 점은 빼도 눈에 띄지 않습니다. (그린 크기 기준 px)
const TOLERANCE = 0.35;

const WIDTH = 320;

const geo = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

/** MultiPolygon/Polygon 을 "바깥 고리들"의 목록으로 폅니다. (구멍은 쓰지 않습니다) */
function outerRings(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.map((poly) => poly[0]).filter(Boolean);
}

const inWindow = ([lng, lat]) =>
  lng >= WINDOW.minLng && lng <= WINDOW.maxLng && lat >= WINDOW.minLat && lat <= WINDOW.maxLat;

// 1) 창 안에 들어오는 고리만 모으고, 전체가 담기는 상자를 구합니다.
const collected = [];
for (const feature of geo.features) {
  const key = NAMES[feature.properties.shapeName];
  if (!key) throw new Error(`모르는 지역 이름: ${feature.properties.shapeName}`);
  const rings = outerRings(feature.geometry).filter((ring) => ring.some(inWindow));
  collected.push({ key, rings });
}

const box = { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity };
for (const { rings } of collected) {
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng < box.minLng) box.minLng = lng;
      if (lng > box.maxLng) box.maxLng = lng;
      if (lat < box.minLat) box.minLat = lat;
      if (lat > box.maxLat) box.maxLat = lat;
    }
  }
}

// 2) 경도·위도를 화면 좌표로. 위도 1도와 경도 1도의 실제 거리가 달라 가운데 위도로 가로를 줄입니다.
const midLat = ((box.minLat + box.maxLat) / 2) * (Math.PI / 180);
const lngScale = Math.cos(midLat);
const spanX = (box.maxLng - box.minLng) * lngScale;
const spanY = box.maxLat - box.minLat;
const scale = WIDTH / spanX;
const HEIGHT = Math.round(spanY * scale);

const project = ([lng, lat]) => [(lng - box.minLng) * lngScale * scale, (box.maxLat - lat) * scale];

/** 고리가 차지하는 넓이 (부호 없음) */
function area(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(sum / 2);
}

/** 선 한 토막을 단순하게 만듭니다 (Douglas-Peucker). 멀리 벗어나는 점만 남깁니다. */
function markKeep(points, first, last, tolerance, keep) {
  const stack = [[first, last]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let index = -1;
    let far = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      // 양 끝이 같은 점이면 선이 아니라 점이므로, 그 점에서 떨어진 거리로 잽니다.
      const dist = len ? Math.abs(dx * (py - ay) - dy * (px - ax)) / len : Math.hypot(px - ax, py - ay);
      if (dist > far) {
        far = dist;
        index = i;
      }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
}

/**
 * 닫힌 고리를 단순하게 만듭니다.
 * 고리는 첫 점과 끝 점이 같아서 그대로 Douglas-Peucker 를 돌리면 "길이 0인 선"이 되어 전부 지워집니다.
 * 그래서 첫 점에서 가장 먼 점을 찾아 고리를 두 토막으로 자른 뒤 각각 돌립니다.
 */
function simplifyRing(ring, tolerance) {
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const points = closed ? ring.slice(0, -1) : ring;
  if (points.length < 5) return ring;

  let split = 0;
  let best = -1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > best) {
      best = d;
      split = i;
    }
  }

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[split] = 1;
  markKeep(points, 0, split, tolerance, keep);
  // 뒤쪽 토막은 split → 끝 → 처음 으로 이어지므로, 첫 점을 하나 더 붙여서 잽니다.
  const tail = points.slice(split).concat([points[0]]);
  const tailKeep = new Uint8Array(tail.length);
  tailKeep[0] = 1;
  tailKeep[tail.length - 1] = 1;
  markKeep(tail, 0, tail.length - 1, tolerance, tailKeep);
  for (let i = 1; i < tail.length - 1; i++) if (tailKeep[i]) keep[split + i] = 1;

  const out = points.filter((_, i) => keep[i]);
  // 삼각형보다 작아지면 모양이 사라지므로 원래 것을 씁니다.
  return out.length >= 3 ? out : points;
}

const round = (n) => Math.round(n * 10) / 10;

/** 고리의 넓이 중심 (이름을 놓을 자리로 씁니다) */
function centroid(ring) {
  let sum = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    sum += cross;
    cx += (ring[j][0] + ring[i][0]) * cross;
    cy += (ring[j][1] + ring[i][1]) * cross;
  }
  if (!sum) return ring[0];
  return [cx / (3 * sum), cy / (3 * sum)];
}

// 3) 지역마다 경로 문자열을 만듭니다.
const out = [];
let pointsBefore = 0;
let pointsAfter = 0;

for (const { key, rings } of collected) {
  const shaped = rings
    .map((ring) => ring.map(project))
    .filter((ring) => area(ring) >= MIN_AREA)
    .sort((a, b) => area(b) - area(a));

  if (!shaped.length) throw new Error(`${key}: 남은 조각이 없습니다 (MIN_AREA 가 너무 큽니다)`);

  const parts = shaped.map((ring) => {
    pointsBefore += ring.length;
    const small = simplifyRing(ring, TOLERANCE);
    pointsAfter += small.length;
    return small.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join('') + 'Z';
  });

  const [lx, ly] = centroid(shaped[0]);
  out.push({ key, d: parts.join(''), label: [round(lx), round(ly)], city: CITIES.has(key), pieces: shaped.length });
}

// content/regions.json 의 차례대로, 단 도를 먼저 쓰고 광역시를 뒤에 씁니다.
const regions = JSON.parse(fs.readFileSync(path.join('content', 'regions.json'), 'utf8')).regions.map((r) => r.key);
out.sort((a, b) => Number(a.city) - Number(b.city) || regions.indexOf(a.key) - regions.indexOf(b.key));

const missing = regions.filter((key) => !out.some((o) => o.key === key));
if (missing.length) throw new Error(`빠진 지역: ${missing.join(', ')}`);

const body = out
  .map(
    (o) =>
      `  // ${o.key} — 조각 ${o.pieces}개\n` +
      `  { key: '${o.key}', city: ${o.city}, label: [${o.label.join(', ')}], d: '${o.d}' },`,
  )
  .join('\n');

const file = `// 이 파일은 scripts/build-region-shapes.mjs 가 만들었습니다. 직접 고치지 마세요.
//
// 자료: geoBoundaries gbOpen KOR ADM1 (simplified) — 저작권 없음(Public Domain)
//       https://www.geoboundaries.org/
// 실제 시·도 경계를 ${WIDTH}×${HEIGHT} 크기로 옮기고, 그 크기에서 보이지 않는 점(${TOLERANCE}px 미만)과
// 아주 작은 섬(${MIN_AREA}제곱 px 미만)은 덜어냈습니다. 그래서 세밀한 해안선과 작은 섬은 생략돼 있습니다.

export const MAP_SIZE = { w: ${WIDTH}, h: ${HEIGHT} };

export interface RegionShape {
  /** content/regions.json 의 key */
  key: string;
  /** 도 안에 들어앉은 광역시인지 (도보다 나중에 그려야 가려지지 않습니다) */
  city: boolean;
  /** 이름을 놓을 자리 (가장 큰 조각의 넓이 중심) */
  label: [number, number];
  /** SVG path 의 d */
  d: string;
}

/** 도를 먼저, 광역시를 뒤에 — 이 차례대로 그리면 됩니다. */
export const REGION_SHAPES: RegionShape[] = [
${body}
];
`;

fs.mkdirSync(path.join('src', 'lib'), { recursive: true });
fs.writeFileSync(path.join('src', 'lib', 'regionShapes.ts'), file, 'utf8');

console.log(`지도 크기 ${WIDTH}×${HEIGHT}`);
console.log(`점 ${pointsBefore} → ${pointsAfter}`);
console.log(`src/lib/regionShapes.ts 썼습니다 (${(Buffer.byteLength(file) / 1024).toFixed(1)} KB)`);
for (const o of out) console.log(`  ${o.key.padEnd(4)} 조각 ${String(o.pieces).padStart(3)}  이름자리 ${o.label.join(',')}`);
