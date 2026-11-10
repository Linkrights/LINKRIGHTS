/**
 * MP4 를 다시 인코딩하지 않고 잘라냅니다.
 *   - 영상 트랙만 남기고 (소리 트랙은 통째로 버림)
 *   - 지정한 시간 뒤의 프레임을 버립니다.
 * 픽셀을 건드리지 않으니 화질 손실이 0 이고, 프레임 간격도 원본 그대로입니다.
 *
 * 사용법: node trim.cjs 입력.mp4 출력.mp4 자를초
 */
const fs = require('fs');

const SRC = process.argv[2];
const OUT = process.argv[3];
const CUT = Number(process.argv[4]);
const buf = fs.readFileSync(SRC);

/* ---------- 박스 훑기 ---------- */
function boxes(start, end) {
  const out = [];
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    let head = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); head = 16; }
    if (size === 0) size = end - p;
    if (size < head) break;
    out.push({ type, start: p, end: p + size, body: p + head, raw: buf.subarray(p, p + size) });
    p += size;
  }
  return out;
}
const find = (list, type) => list.find((b) => b.type === type);
const kids = (b) => boxes(b.body, b.end);

const top = boxes(0, buf.length);
const ftyp = find(top, 'ftyp');
const moov = find(top, 'moov');
const mvhd = find(kids(moov), 'mvhd');

/* 영상 트랙 찾기: minf 안에 vmhd 가 있는 trak */
let vtrak = null;
for (const trak of kids(moov).filter((b) => b.type === 'trak')) {
  const mi = find(kids(find(kids(trak), 'mdia')), 'minf');
  if (find(kids(mi), 'vmhd')) { vtrak = trak; break; }
}
if (!vtrak) throw new Error('영상 트랙을 못 찾았습니다');

const tkhd = find(kids(vtrak), 'tkhd');
const edts = find(kids(vtrak), 'edts');
const mdia = find(kids(vtrak), 'mdia');
const mdhd = find(kids(mdia), 'mdhd');
const hdlr = find(kids(mdia), 'hdlr');
const minf = find(kids(mdia), 'minf');
const vmhd = find(kids(minf), 'vmhd');
const dinf = find(kids(minf), 'dinf');
const stbl = find(kids(minf), 'stbl');
const S = kids(stbl);
const stsd = find(S, 'stsd');

if (find(S, 'ctts')) throw new Error('ctts 가 있어 이 단순 트리머로는 못 자릅니다');

/* ---------- 샘플 표 읽기 ---------- */
const mdhdVer = buf[mdhd.body];
const timescale = mdhdVer === 1 ? buf.readUInt32BE(mdhd.body + 20) : buf.readUInt32BE(mdhd.body + 12);

function readStts(b) {
  const n = buf.readUInt32BE(b.body + 4);
  const runs = [];
  for (let i = 0; i < n; i++) {
    runs.push({ count: buf.readUInt32BE(b.body + 8 + i * 8), delta: buf.readUInt32BE(b.body + 12 + i * 8) });
  }
  return runs;
}
function readStsz(b) {
  const uniform = buf.readUInt32BE(b.body + 4);
  const n = buf.readUInt32BE(b.body + 8);
  const sizes = [];
  for (let i = 0; i < n; i++) sizes.push(uniform || buf.readUInt32BE(b.body + 12 + i * 4));
  return sizes;
}
function readStco(b) {
  const n = buf.readUInt32BE(b.body + 4);
  const offs = [];
  for (let i = 0; i < n; i++) offs.push(buf.readUInt32BE(b.body + 8 + i * 4));
  return offs;
}
function readCo64(b) {
  const n = buf.readUInt32BE(b.body + 4);
  const offs = [];
  for (let i = 0; i < n; i++) offs.push(Number(buf.readBigUInt64BE(b.body + 8 + i * 8)));
  return offs;
}
function readStsc(b) {
  const n = buf.readUInt32BE(b.body + 4);
  const e = [];
  for (let i = 0; i < n; i++) {
    e.push({
      first: buf.readUInt32BE(b.body + 8 + i * 12),
      per: buf.readUInt32BE(b.body + 12 + i * 12),
      desc: buf.readUInt32BE(b.body + 16 + i * 12),
    });
  }
  return e;
}
function readStss(b) {
  if (!b) return null;
  const n = buf.readUInt32BE(b.body + 4);
  const k = [];
  for (let i = 0; i < n; i++) k.push(buf.readUInt32BE(b.body + 8 + i * 4));
  return k;
}

const sizes = readStsz(find(S, 'stsz'));
const chunkOffs = find(S, 'stco') ? readStco(find(S, 'stco')) : readCo64(find(S, 'co64'));
const stsc = readStsc(find(S, 'stsc'));
const stss = readStss(find(S, 'stss'));
const sttsRuns = readStts(find(S, 'stts'));

/* 샘플별 원본 파일 위치 */
const offsets = new Array(sizes.length);
{
  let sample = 0;
  for (let ci = 0; ci < chunkOffs.length && sample < sizes.length; ci++) {
    let per = stsc[0].per;
    for (let i = stsc.length - 1; i >= 0; i--) if (stsc[i].first <= ci + 1) { per = stsc[i].per; break; }
    let at = chunkOffs[ci];
    for (let k = 0; k < per && sample < sizes.length; k++, sample++) {
      offsets[sample] = at;
      at += sizes[sample];
    }
  }
}

/* 샘플별 길이 */
const deltas = [];
for (const r of sttsRuns) for (let i = 0; i < r.count; i++) deltas.push(r.delta);

let keep = 0;
let acc = 0;
for (let i = 0; i < deltas.length; i++) {
  if ((acc + deltas[i]) / timescale > CUT) break;
  acc += deltas[i];
  keep = i + 1;
}
if (keep === 0) throw new Error('남는 프레임이 없습니다');
const newDur = acc;

/* ---------- 박스 짓기 ---------- */
const b4 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
function box(type, ...parts) {
  const body = Buffer.concat(parts);
  return Buffer.concat([b4(body.length + 8), Buffer.from(type, 'latin1'), body]);
}
const full = (type, ver, flags, ...parts) =>
  box(type, Buffer.from([ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);

/* 새 stts: 길이가 같은 것끼리 묶어 적습니다 */
const runs = [];
for (let i = 0; i < keep; i++) {
  const d = deltas[i];
  if (runs.length && runs[runs.length - 1].delta === d) runs[runs.length - 1].count++;
  else runs.push({ count: 1, delta: d });
}
const flat = [];
for (const r of runs) { flat.push(b4(r.count)); flat.push(b4(r.delta)); }
const newStts = full('stts', 0, 0, b4(runs.length), ...flat);
const newStsz = full('stsz', 0, 0, b4(0), b4(keep), ...sizes.slice(0, keep).map(b4));
/* 샘플 하나당 청크 하나로 단순하게 다시 깝니다 */
const newStsc = full('stsc', 0, 0, b4(1), b4(1), b4(1), b4(1));
const keptStss = stss ? stss.filter((n) => n <= keep) : null;
const newStss = keptStss ? full('stss', 0, 0, b4(keptStss.length), ...keptStss.map(b4)) : null;

if (buf[mvhd.body] !== 0 || buf[tkhd.body] !== 0 || mdhdVer !== 0) {
  throw new Error('version 1 헤더는 아직 지원하지 않습니다');
}
function patched(src, offsetInBody, value) {
  const copy = Buffer.from(src.raw);
  copy.writeUInt32BE(value, 8 + offsetInBody);
  return copy;
}
const mvhdTimescale = buf.readUInt32BE(mvhd.body + 12);
const movieDur = Math.round((newDur / timescale) * mvhdTimescale);

const newMvhd = patched(mvhd, 16, movieDur);   /* v0: 만든때4 고친때4 timescale4 duration4 */
const newTkhd = patched(tkhd, 20, movieDur);   /* v0: 만든때4 고친때4 트랙번호4 예약4 duration4 */
const newMdhd = patched(mdhd, 16, newDur);
let newEdts = null;
if (edts) {
  const elst = find(kids(edts), 'elst');
  if (elst && buf[elst.body] === 0 && buf.readUInt32BE(elst.body + 4) === 1) {
    const copy = Buffer.from(elst.raw);
    copy.writeUInt32BE(movieDur, 16);          /* 박스8 + 버전플래그4 + 개수4 = segment_duration */
    newEdts = box('edts', copy);
  } else {
    newEdts = edts.raw;
  }
}

/* stco 크기가 정해져야 mdat 위치를 알 수 있으니, 자리만 잡고 뒤에 채웁니다 */
const stcoSize = 16 + keep * 4;
function assemble(stcoBuf) {
  const nStbl = box('stbl', stsd.raw, newStts, ...(newStss ? [newStss] : []), newStsc, newStsz, stcoBuf);
  const nMinf = box('minf', vmhd.raw, dinf.raw, nStbl);
  const nMdia = box('mdia', newMdhd, hdlr.raw, nMinf);
  const nTrak = box('trak', newTkhd, ...(newEdts ? [newEdts] : []), nMdia);
  return box('moov', newMvhd, nTrak);
}
const probeMoov = assemble(Buffer.alloc(stcoSize));
const mdatStart = ftyp.raw.length + probeMoov.length + 8;

const newOffsets = [];
let at = mdatStart;
for (let i = 0; i < keep; i++) { newOffsets.push(at); at += sizes[i]; }
const realStco = full('stco', 0, 0, b4(keep), ...newOffsets.map(b4));
if (realStco.length !== stcoSize) throw new Error('stco 크기 예측이 틀렸습니다');

const payload = Buffer.concat(sizes.slice(0, keep).map((sz, i) => buf.subarray(offsets[i], offsets[i] + sz)));
const mdat = Buffer.concat([b4(payload.length + 8), Buffer.from('mdat', 'latin1'), payload]);

fs.writeFileSync(OUT, Buffer.concat([ftyp.raw, assemble(realStco), mdat]));

const totalDur = deltas.reduce((a, b) => a + b, 0) / timescale;
console.log('원본   ' + sizes.length + '프레임  ' + totalDur.toFixed(3) + '초  ' +
  (buf.length / 1048576).toFixed(2) + 'MB  (소리 포함)');
console.log('결과   ' + keep + '프레임  ' + (newDur / timescale).toFixed(3) + '초  ' +
  (fs.statSync(OUT).size / 1048576).toFixed(2) + 'MB  (소리 없음)');
console.log('키프레임 ' + (keptStss ? keptStss.length : 0) + '개');
