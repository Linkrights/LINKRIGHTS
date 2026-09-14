/**
 * 콘텐츠 점검 스크립트
 *
 * 무엇을 하나요?
 *  - content 폴더의 JSON 파일에 문법 오류(쉼표 빠짐, 따옴표 빠짐 등)가 없는지 확인합니다.
 *  - 꼭 있어야 하는 항목이 빠지지 않았는지 확인합니다.
 *  - 등록되지 않은 기관 id 를 사용하고 있지 않은지 확인합니다.
 *
 * 언제 실행되나요?
 *  - 터미널에서  npm run check   를 입력할 때
 *  - 배포(빌드)할 때 자동으로 한 번 더 실행됩니다.
 *
 * 오류가 있으면 "무슨 파일의 무엇이 잘못됐는지" 한국어로 알려줍니다.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const MESSAGES = path.join(ROOT, 'messages');
const LOCALES = ['ko', 'en', 'zh', 'vi'];
const VALID_STATUS = ['published', 'draft'];
const VALID_ORG_CATEGORIES = ['emergency', 'public', 'youth', 'migrant', 'legal'];

const errors = [];
const warnings = [];

function fail(file, message) {
  errors.push(`  [${file}] ${message}`);
}
function warn(file, message) {
  warnings.push(`  [${file}] ${message}`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    fail(label, `JSON 형식이 잘못되었습니다. 쉼표(,)나 따옴표(")가 빠지지 않았는지 확인하세요. → ${error.message}`);
    return null;
  }
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function hasKo(value, label, field) {
  if (!value || typeof value !== 'object' || typeof value.ko !== 'string' || !value.ko.trim()) {
    fail(label, `"${field}" 항목에 한국어("ko") 문구가 반드시 있어야 합니다.`);
    return false;
  }
  return true;
}

// ---------- 1. 분야(categories.json) ----------
const categories = readJson(path.join(CONTENT, 'categories.json'), 'content/categories.json');
const categoryIds = new Set();
if (Array.isArray(categories)) {
  for (const category of categories) {
    if (!category.id) fail('content/categories.json', '"id" 가 없는 분야가 있습니다.');
    else if (categoryIds.has(category.id)) fail('content/categories.json', `분야 id 가 중복됩니다: ${category.id}`);
    else categoryIds.add(category.id);
    hasKo(category.name, 'content/categories.json', `${category.id} > name`);
  }
} else if (categories !== null) {
  fail('content/categories.json', '이 파일은 대괄호 [ ] 로 시작하는 목록이어야 합니다.');
}

// ---------- 2. 기관(organizations.json) ----------
const organizations = readJson(path.join(CONTENT, 'organizations.json'), 'content/organizations.json');
const orgIds = new Set();
if (Array.isArray(organizations)) {
  for (const org of organizations) {
    const label = `content/organizations.json > ${org.id ?? '(id 없음)'}`;
    if (!org.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (orgIds.has(org.id)) fail(label, `기관 id 가 중복됩니다: ${org.id}`);
    else orgIds.add(org.id);

    hasKo(org.name, label, 'name');
    hasKo(org.description, label, 'description');

    if (!VALID_ORG_CATEGORIES.includes(org.category)) {
      fail(label, `"category" 는 ${VALID_ORG_CATEGORIES.join(', ')} 중 하나여야 합니다. (현재: ${org.category})`);
    }
    if (!VALID_STATUS.includes(org.status)) {
      fail(label, `"status" 는 published 또는 draft 여야 합니다. (현재: ${org.status})`);
    }
    if (!isDate(org.reviewed_at)) {
      fail(label, '"reviewed_at" 은 2026-09-06 처럼 연-월-일 형식이어야 합니다.');
    }
    if (!org.owner) warn(label, '"owner"(담당자)가 비어 있습니다.');
    if (org.website && !/^https?:\/\//.test(org.website)) {
      fail(label, '"website" 는 https:// 로 시작해야 합니다.');
    }
    if (!org.phone && !org.website) {
      warn(label, '전화번호와 홈페이지가 모두 비어 있습니다. 이용자가 연락할 방법이 없습니다.');
    }
  }
} else if (organizations !== null) {
  fail('content/organizations.json', '이 파일은 대괄호 [ ] 로 시작하는 목록이어야 합니다.');
}

// ---------- 3. 권리정보(content/rights/*.json) ----------
const rightsDir = path.join(CONTENT, 'rights');
const articleIds = new Set();
const articles = [];
if (fs.existsSync(rightsDir)) {
  for (const fileName of fs.readdirSync(rightsDir).filter((n) => n.endsWith('.json'))) {
    const label = `content/rights/${fileName}`;
    const article = readJson(path.join(rightsDir, fileName), label);
    if (!article) continue;
    articles.push({ article, label });

    const expectedId = fileName.replace(/\.json$/, '');
    if (article.id !== expectedId) {
      fail(label, `"id" 값(${article.id})과 파일 이름(${expectedId})이 다릅니다. 두 값을 똑같이 맞춰주세요.`);
    }
    if (articleIds.has(article.id)) fail(label, `권리정보 id 가 중복됩니다: ${article.id}`);
    articleIds.add(article.id);

    if (!categoryIds.has(article.category)) {
      fail(label, `"category" 값(${article.category})이 categories.json 에 없습니다.`);
    }
    if (!VALID_STATUS.includes(article.status)) {
      fail(label, `"status" 는 published 또는 draft 여야 합니다. (현재: ${article.status})`);
    }
    if (!isDate(article.reviewed_at)) {
      fail(label, '"reviewed_at" 은 2026-09-06 처럼 연-월-일 형식이어야 합니다.');
    }
    if (!Array.isArray(article.sources) || article.sources.length === 0) {
      warn(label, '"sources"(출처)가 비어 있습니다. 공식 출처를 최소 한 개 넣어주세요.');
    } else {
      for (const source of article.sources) {
        if (!source.url || !/^https?:\/\//.test(source.url)) {
          fail(label, `출처 링크가 https:// 로 시작하지 않습니다: ${source.url}`);
        }
      }
    }

    const ko = article.i18n?.ko;
    if (!ko) {
      fail(label, '"i18n" 안에 한국어("ko") 본문이 반드시 있어야 합니다.');
    } else {
      for (const field of ['title', 'summary']) {
        if (!ko[field]) fail(label, `한국어 본문에 "${field}" 가 없습니다.`);
      }
      for (const field of ['situations', 'rights', 'actions']) {
        if (!Array.isArray(ko[field]) || ko[field].length === 0) {
          fail(label, `한국어 본문의 "${field}" 는 비어 있지 않은 목록이어야 합니다.`);
        }
      }
    }

    for (const locale of LOCALES) {
      const body = article.i18n?.[locale];
      if (!body) continue;
      for (const field of ['situations', 'rights', 'actions']) {
        if (!Array.isArray(body[field])) {
          fail(label, `${locale} 본문의 "${field}" 가 목록이 아닙니다.`);
        }
      }
    }

    for (const id of article.organizations ?? []) {
      if (!orgIds.has(id)) {
        fail(label, `"organizations" 에 등록되지 않은 기관 id 가 있습니다: ${id}`);
      }
    }
  }
}

// 관련글 id 확인 (모든 파일을 다 읽은 뒤에 확인해야 합니다)
for (const { article, label } of articles) {
  for (const id of article.related ?? []) {
    if (!articleIds.has(id)) {
      fail(label, `"related" 에 없는 권리정보 id 가 있습니다: ${id}`);
    }
  }
}

// ---------- 4. 긴급 설정(emergency.json) ----------
const emergency = readJson(path.join(CONTENT, 'emergency.json'), 'content/emergency.json');
if (emergency) {
  for (const id of emergency.organizations ?? []) {
    if (!orgIds.has(id)) fail('content/emergency.json', `등록되지 않은 기관 id 입니다: ${id}`);
  }
  hasKo(emergency.title, 'content/emergency.json', 'title');
  hasKo(emergency.message, 'content/emergency.json', 'message');
  if (!Array.isArray(emergency.steps?.ko) || emergency.steps.ko.length === 0) {
    fail('content/emergency.json', '"steps" 의 한국어 목록이 비어 있습니다.');
  }
}

// ---------- 4-1. 상황 사전(search-intents.json) ----------
// 짧은 질문을 등록 권리정보와 연결하는 사전입니다. 등록되지 않은 글을 가리키면 안 됩니다.
const intentsPath = path.join(CONTENT, 'search-intents.json');
if (fs.existsSync(intentsPath)) {
  const intentsFile = readJson(intentsPath, 'content/search-intents.json');
  const intents = intentsFile?.intents;
  if (intentsFile && !Array.isArray(intents)) fail('content/search-intents.json', '"intents" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  const intentIds = new Set();
  for (const intent of Array.isArray(intents) ? intents : []) {
    const label = `content/search-intents.json > ${intent.id ?? '(id 없음)'}`;
    if (!intent.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (intentIds.has(intent.id)) fail(label, `상황 id 가 중복됩니다: ${intent.id}`);
    else intentIds.add(intent.id);
    if (!intent.label) fail(label, '"label"(상황 이름)이 필요합니다.');
    if (!Array.isArray(intent.articles) || intent.articles.length === 0) {
      fail(label, '"articles" 에 연결할 권리정보가 하나 이상 있어야 합니다.');
    }
    for (const ref of intent.articles ?? []) {
      if (!articleIds.has(ref.id)) fail(label, `"articles" 에 등록되지 않은 권리정보 id 가 있습니다: ${ref.id}`);
      if (!['direct', 'possible'].includes(ref.match)) {
        fail(label, `"match" 는 direct 또는 possible 이어야 합니다. (현재: ${ref.match})`);
      }
    }
    const triggers = Object.values(intent.triggers ?? {}).flat();
    if (triggers.length === 0) fail(label, '"triggers"(사용자 표현)가 하나 이상 있어야 합니다.');
    for (const trigger of triggers) {
      if (typeof trigger !== 'string' || trigger.replace(/\s/g, '').length < 2) {
        fail(label, `표현은 띄어쓰기를 빼고 두 글자 이상이어야 합니다: ${trigger}`);
      }
    }
    if (typeof intent.clarify === 'string' && (intent.clarify.match(/[?？]/g) ?? []).length > 1) {
      fail(label, '"clarify" 에는 질문을 하나만 쓸 수 있습니다.');
    }
  }
}

// ---------- 4-2. 협력기관(partners.json) ----------
// 실제로 협력하는 기관만 등록합니다. 로고 파일이 실제로 있는지, 주소가 https 인지 확인합니다.
const partnersPath = path.join(CONTENT, 'partners.json');
if (fs.existsSync(partnersPath)) {
  const partnersFile = readJson(partnersPath, 'content/partners.json');
  const partners = partnersFile?.partners;
  if (partnersFile && !Array.isArray(partners)) fail('content/partners.json', '"partners" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  const partnerIds = new Set();
  for (const partner of Array.isArray(partners) ? partners : []) {
    const label = `content/partners.json > ${partner.id ?? '(id 없음)'}`;
    if (!partner.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (partnerIds.has(partner.id)) fail(label, `협력기관 id 가 중복됩니다: ${partner.id}`);
    else partnerIds.add(partner.id);
    if (!['published', 'draft'].includes(partner.status)) fail(label, '"status" 는 published 또는 draft 이어야 합니다.');
    if (!partner.name?.ko) fail(label, '"name" 에 한국어 이름(ko)이 필요합니다.');
    if (!partner.relation?.ko) fail(label, '"relation"(예: 협력기관)에 한국어(ko)가 필요합니다.');
    if (partner.logo && !fs.existsSync(path.join(CONTENT, '..', 'public', partner.logo))) {
      fail(label, `로고 파일이 없습니다: public${partner.logo}`);
    }
    if (partner.url && !/^https:\/\//.test(partner.url)) fail(label, `"url" 은 https:// 로 시작하는 공식 주소여야 합니다: ${partner.url}`);
  }
}

// ---------- 5. 나머지 파일 ----------
for (const name of ['site.json', 'about.json', 'programs.json', 'faq.json']) {
  const data = readJson(path.join(CONTENT, name), `content/${name}`);
  if (!data) continue;
  if (name === 'about.json' && !data.i18n?.ko) fail('content/about.json', '한국어("ko") 내용이 필요합니다.');
  if (name === 'site.json' && !data.contactEmail) warn('content/site.json', '"contactEmail"(문의 이메일)이 비어 있습니다.');
}

// ---------- 6. 화면 문구(messages) ----------
const baseMessages = readJson(path.join(MESSAGES, 'ko.json'), 'messages/ko.json');
if (baseMessages) {
  for (const locale of LOCALES.filter((l) => l !== 'ko')) {
    const file = path.join(MESSAGES, `${locale}.json`);
    if (!fs.existsSync(file)) {
      fail(`messages/${locale}.json`, '파일이 없습니다.');
      continue;
    }
    const data = readJson(file, `messages/${locale}.json`);
    if (!data) continue;
    for (const key of Object.keys(baseMessages)) {
      if (!(key in data)) fail(`messages/${locale}.json`, `"${key}" 항목이 빠졌습니다. ko.json 과 같은 구조여야 합니다.`);
    }
  }
}

// ---------- 결과 출력 ----------
if (warnings.length > 0) {
  console.log('\n⚠️  확인해 보면 좋은 점 (배포는 계속됩니다)');
  console.log(warnings.join('\n'));
}

if (errors.length > 0) {
  console.error('\n❌ 콘텐츠에 고쳐야 할 부분이 있습니다.');
  console.error(errors.join('\n'));
  console.error('\n위에 적힌 파일을 열어 해당 부분을 고친 뒤 다시 시도하세요.\n');
  process.exit(1);
}

console.log(`\n✅ 콘텐츠 점검 완료 — 권리정보 ${articleIds.size}개, 기관 ${orgIds.size}개, 분야 ${categoryIds.size}개\n`);
