/**
 * 지금 폴더와 GitHub main 을 견주어, 올려야 할 파일만 추립니다.
 *
 * 이 컴퓨터에는 git 이 없어서, git 이 쓰는 것과 같은 방식으로 파일 지문을 직접 냅니다.
 *   지문 = sha1("blob " + 바이트수 + "\0" + 내용)
 * GitHub 가 알려주는 지문과 이 값을 맞춰 보면, 내용이 같은 파일은 건너뛸 수 있습니다.
 *
 * 사용법: node scripts/deploy-diff.cjs [저장소] [가지]
 *   예:   node scripts/deploy-diff.cjs Linkrights/LINKRIGHTS main
 *   gh 가 PATH 에 없으면 GH 환경변수에 gh.exe 경로를 넣어 주세요.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO = process.argv[2] || 'Linkrights/LINKRIGHTS';
const BRANCH = process.argv[3] || 'main';
const ROOT = path.resolve(__dirname, '..');

/* 무거워서 애초에 들어가지도 않는 것들 */
const SKIP_DIR = new Set(['node_modules', '.next', '.git', '.vercel']);
const SKIP_FILE = new Set(['.DS_Store', '.deploy-list.json']);

/**
 * .gitignore 를 읽어 "이 파일은 빼야 하나?" 를 답해 주는 함수를 만듭니다.
 * 이 저장소가 쓰는 규칙이 단순해서(이름 / *.확장자 / 앞에 / 붙은 것) 그만큼만 다룹니다.
 */
function makeIgnore(root) {
  let text = '';
  try {
    text = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  } catch {
    return () => false;
  }
  const rules = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))
    .map((raw) => {
      const anchored = raw.startsWith('/');
      const body = (anchored ? raw.slice(1) : raw).replace(/\/$/, '');
      // 정규식에서 뜻을 가지는 글자를 막고, * 만 "슬래시 아닌 아무 글자"로 풀어 줍니다.
      const escaped = body.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
      return { rx: new RegExp('^' + escaped + '$'), anchored };
    });
  return (rel) => {
    if (rules.some((r) => r.anchored && r.rx.test(rel))) return true;
    const parts = rel.split('/');
    return rules.some((r) => !r.anchored && parts.some((seg) => r.rx.test(seg)));
  };
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIR.has(name) || SKIP_FILE.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return out;
}

function blobSha(file) {
  const data = fs.readFileSync(path.join(ROOT, file));
  const h = crypto.createHash('sha1');
  h.update('blob ' + data.length + '\0');
  h.update(data);
  return h.digest('hex');
}

function gh(args) {
  const exe = process.env.GH || 'gh';
  return execFileSync(exe, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const tree = JSON.parse(gh(['api', `repos/${REPO}/git/trees/${BRANCH}?recursive=1`]));
if (tree.truncated) console.warn('! GitHub 목록이 잘렸습니다 — 결과가 부정확할 수 있습니다');
const remote = new Map();
for (const e of tree.tree) if (e.type === 'blob') remote.set(e.path, e.sha);

const ignored = makeIgnore(ROOT);
const local = walk(ROOT).filter((f) => !ignored(f));

const added = [];
const changed = [];
for (const f of local) {
  const theirs = remote.get(f);
  if (!theirs) added.push(f);
  else if (theirs !== blobSha(f)) changed.push(f);
}
const localSet = new Set(local);
const removed = [...remote.keys()].filter((f) => !localSet.has(f));

const size = (f) => fs.statSync(path.join(ROOT, f)).size;
const show = (title, list) => {
  if (!list.length) return;
  console.log('\n' + title + ' (' + list.length + '개)');
  for (const f of list.slice().sort()) {
    const s = size(f);
    console.log('  ' + f + (s > 100000 ? '   ' + (s / 1048576).toFixed(2) + 'MB' : ''));
  }
};
show('새로 생긴 것', added);
show('내용이 바뀐 것', changed);
if (removed.length) {
  console.log('\n여기엔 없고 GitHub 에만 있는 것 (' + removed.length + '개) — 지울지는 사람이 정합니다');
  for (const f of removed.slice().sort()) console.log('  ' + f);
}

const upload = [...added, ...changed];
const total = upload.reduce((a, f) => a + size(f), 0);
console.log('\n올릴 파일 ' + upload.length + '개, 합계 ' + (total / 1048576).toFixed(2) + 'MB');
fs.writeFileSync(
  path.join(ROOT, 'scripts', '.deploy-list.json'),
  JSON.stringify({ repo: REPO, branch: BRANCH, upload, remove: removed }, null, 2),
);
console.log('목록을 scripts/.deploy-list.json 에 적어 뒀습니다');
