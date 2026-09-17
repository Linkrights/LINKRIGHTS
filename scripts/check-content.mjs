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

// ---------- 4-3. 자주 묻는 질문(faq.json) ----------
// 카테고리는 정해진 6개 중 하나여야 하고, 전화 버튼으로 보여줄 기관은 등록된 기관이어야 합니다.
const FAQ_CATEGORIES = ['usage', 'ai', 'privacy', 'rights', 'programs', 'emergency'];
const faqFile = readJson(path.join(CONTENT, 'faq.json'), 'content/faq.json');
if (faqFile) {
  const faqItems = Array.isArray(faqFile.items) ? faqFile.items : [];
  if (!Array.isArray(faqFile.items)) fail('content/faq.json', '"items" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  const faqIds = new Set();
  for (const item of faqItems) {
    const label = `content/faq.json > ${item.id ?? '(id 없음)'}`;
    if (!item.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (faqIds.has(item.id)) fail(label, `질문 id 가 중복됩니다: ${item.id}`);
    else faqIds.add(item.id);
    if (!FAQ_CATEGORIES.includes(item.category)) {
      fail(label, `"category" 는 ${FAQ_CATEGORIES.join(', ')} 중 하나여야 합니다. (현재: ${item.category})`);
    }
    if (!item.q?.ko || !item.a?.ko) fail(label, '질문(q)과 답(a)에 한국어(ko)가 필요합니다.');
    for (const id of item.organizations ?? []) {
      if (!orgIds.has(id)) fail(label, `"organizations" 에 등록되지 않은 기관 id 가 있습니다: ${id}`);
    }
  }
  const featuredCount = faqItems.filter((item) => item.featured).length;
  if (featuredCount > 4) warn('content/faq.json', `홈에는 4개까지만 보입니다. featured 가 ${featuredCount}개입니다.`);
}

// ---------- 4-4. 참여자 후기(testimonials.json) ----------
// 실제 인터뷰 문구만, 공개 동의(consent: true)를 받은 경우에만 공개할 수 있습니다.
const testimonialsPath = path.join(CONTENT, 'testimonials.json');
if (fs.existsSync(testimonialsPath)) {
  const file = readJson(testimonialsPath, 'content/testimonials.json');
  if (file && !Array.isArray(file.items)) fail('content/testimonials.json', '"items" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  const ids = new Set();
  for (const item of Array.isArray(file?.items) ? file.items : []) {
    const label = `content/testimonials.json > ${item.id ?? '(id 없음)'}`;
    if (!item.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (ids.has(item.id)) fail(label, `후기 id 가 중복됩니다: ${item.id}`);
    else ids.add(item.id);
    if (!VALID_STATUS.includes(item.status)) fail(label, '"status" 는 published 또는 draft 이어야 합니다.');
    if (!item.quote?.ko?.trim()) fail(label, '"quote" 에 한국어(ko) 문구가 필요합니다.');
    if (!item.role?.ko?.trim()) fail(label, '"role"(예: 대학생 멘토)에 한국어(ko)가 필요합니다.');
    if (item.status === 'published' && item.consent !== true) {
      fail(label, '공개(published)하려면 공개 동의를 받았다는 뜻으로 "consent": true 가 필요합니다.');
    }
  }
}

// ---------- 4-5. 쉬운 말 풀이(glossary.json) ----------
const glossaryPath = path.join(CONTENT, 'glossary.json');
if (fs.existsSync(glossaryPath)) {
  const file = readJson(glossaryPath, 'content/glossary.json');
  if (file && !Array.isArray(file.terms)) fail('content/glossary.json', '"terms" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  const ids = new Set();
  for (const item of Array.isArray(file?.terms) ? file.terms : []) {
    const label = `content/glossary.json > ${item.id ?? '(id 없음)'}`;
    if (!item.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (ids.has(item.id)) fail(label, `용어 id 가 중복됩니다: ${item.id}`);
    else ids.add(item.id);
    if (!VALID_STATUS.includes(item.status)) fail(label, '"status" 는 published 또는 draft 이어야 합니다.');
    if (!item.term?.ko?.trim() || !item.easy?.ko?.trim()) fail(label, '"term"(용어)과 "easy"(쉬운 설명)에 한국어(ko)가 필요합니다.');
  }
}

// ---------- 4-6. 지역(regions.json)과 기관의 이용 지역 ----------
const regionsFile = readJson(path.join(CONTENT, 'regions.json'), 'content/regions.json');
const regionKeys = new Set();
if (regionsFile) {
  if (!Array.isArray(regionsFile.regions)) fail('content/regions.json', '"regions" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  for (const region of Array.isArray(regionsFile.regions) ? regionsFile.regions : []) {
    if (!region.key) fail('content/regions.json', '"key" 가 없는 지역이 있습니다.');
    else if (regionKeys.has(region.key)) fail('content/regions.json', `지역 key 가 중복됩니다: ${region.key}`);
    else regionKeys.add(region.key);
    hasKo(region.name, 'content/regions.json', `${region.key} > name`);
  }
}
for (const org of Array.isArray(organizations) ? organizations : []) {
  const label = `content/organizations.json > ${org.id ?? '(id 없음)'}`;
  if (org.region !== '전국' && !regionKeys.has(org.region)) {
    fail(label, `"region" 은 "전국" 또는 content/regions.json 의 key 여야 합니다. (현재: ${org.region})`);
  }
  if (org.nationwide !== undefined && typeof org.nationwide !== 'boolean') fail(label, '"nationwide" 는 true 또는 false 여야 합니다.');
  if (org.regions !== undefined) {
    if (!Array.isArray(org.regions)) fail(label, '"regions" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
    for (const key of Array.isArray(org.regions) ? org.regions : []) {
      if (!regionKeys.has(key)) fail(label, `"regions" 에 content/regions.json 에 없는 지역이 있습니다: ${key}`);
    }
  }
  const nationwide = org.nationwide ?? org.region === '전국';
  const regions = org.regions ?? (org.region && org.region !== '전국' ? [org.region] : []);
  if (!nationwide && regions.length === 0) warn(label, '전국 기관도 아니고 이용 지역도 없어 지역을 고르면 보이지 않습니다.');
}

// ---------- 4-7. 검색용 유사 표현(search-synonyms.json) ----------
const synonymsPath = path.join(CONTENT, 'search-synonyms.json');
if (fs.existsSync(synonymsPath)) {
  const file = readJson(synonymsPath, 'content/search-synonyms.json');
  if (file && !Array.isArray(file.groups)) fail('content/search-synonyms.json', '"groups" 는 대괄호 [ ] 로 된 목록이어야 합니다.');
  const ids = new Set();
  for (const group of Array.isArray(file?.groups) ? file.groups : []) {
    const label = `content/search-synonyms.json > ${group.id ?? '(id 없음)'}`;
    if (!group.id) fail(label, '"id" 가 반드시 필요합니다.');
    else if (ids.has(group.id)) fail(label, `묶음 id 가 중복됩니다: ${group.id}`);
    else ids.add(group.id);
    if (!Array.isArray(group.terms) || group.terms.length < 2) fail(label, '"terms" 에는 표현이 두 개 이상 있어야 합니다.');
    for (const term of Array.isArray(group.terms) ? group.terms : []) {
      if (typeof term !== 'string' || term.replace(/\s/g, '').length < 2) fail(label, `표현은 띄어쓰기를 빼고 두 글자 이상이어야 합니다: ${term}`);
    }
  }
}

// ---------- 4-8. 체크리스트(content/checklists/*.json) ----------
const checklistDir = path.join(CONTENT, 'checklists');
if (fs.existsSync(checklistDir)) {
  const checklistIds = new Set();
  for (const fileName of fs.readdirSync(checklistDir).filter((n) => n.endsWith('.json'))) {
    const label = `content/checklists/${fileName}`;
    const checklist = readJson(path.join(checklistDir, fileName), label);
    if (!checklist) continue;
    const expectedId = fileName.replace(/\.json$/, '');
    if (checklist.id !== expectedId) fail(label, `"id" 값(${checklist.id})과 파일 이름(${expectedId})이 다릅니다.`);
    if (checklistIds.has(checklist.id)) fail(label, `체크리스트 id 가 중복됩니다: ${checklist.id}`);
    checklistIds.add(checklist.id);
    if (!VALID_STATUS.includes(checklist.status)) fail(label, '"status" 는 published 또는 draft 여야 합니다.');
    if (!isDate(checklist.reviewed_at)) fail(label, '"reviewed_at" 은 2026-09-06 처럼 연-월-일 형식이어야 합니다.');
    if (!categoryIds.has(checklist.category)) fail(label, `"category" 값(${checklist.category})이 categories.json 에 없습니다.`);
    if (!checklist.i18n?.ko?.title) fail(label, '한국어("ko") 제목(title)이 필요합니다.');
    for (const id of checklist.based_on ?? []) {
      if (!articleIds.has(id)) fail(label, `"based_on" 에 등록되지 않은 권리정보 id 가 있습니다: ${id}`);
    }
    for (const id of checklist.organizations ?? []) {
      if (!orgIds.has(id)) fail(label, `"organizations" 에 등록되지 않은 기관 id 가 있습니다: ${id}`);
    }
    if (!Array.isArray(checklist.items) || checklist.items.length === 0) fail(label, '"items" 에 항목이 하나 이상 있어야 합니다.');
    const itemIds = new Set();
    for (const item of Array.isArray(checklist.items) ? checklist.items : []) {
      if (!item.id) fail(label, '"id" 가 없는 항목이 있습니다.');
      else if (itemIds.has(item.id)) fail(label, `항목 id 가 중복됩니다: ${item.id}`);
      else itemIds.add(item.id);
      hasKo(item.text, label, `${item.id} > text`);
      if (item.article && !articleIds.has(item.article)) fail(label, `항목 ${item.id} 의 "article" 이 등록되지 않은 권리정보입니다: ${item.article}`);
      if (item.link && !['organizations', 'emergency'].includes(item.link)) fail(label, `항목 ${item.id} 의 "link" 는 organizations 또는 emergency 여야 합니다.`);
    }
  }
}

// ---------- 4-9. 하단 SNS·카카오톡 채널 주소(site.json) ----------
{
  const site = readJson(path.join(CONTENT, 'site.json'), 'content/site.json');
  for (const [key, link] of Object.entries(site?.social ?? {})) {
    if (link?.url && !/^https:\/\//.test(link.url)) fail('content/site.json', `social.${key}.url 은 https:// 로 시작하는 실제 주소여야 합니다: ${link.url}`);
    if (link?.url && !link.label) warn('content/site.json', `social.${key} 에 표시할 이름(label)이 비어 있습니다.`);
  }
  if (site?.locations !== undefined && !Array.isArray(site.locations)) fail('content/site.json', 'locations 는 목록이어야 합니다.');
  for (const [i, place] of (Array.isArray(site?.locations) ? site.locations : []).entries()) {
    if (!place?.name?.ko) fail('content/site.json', `locations[${i}] 에 한국어 이름(name.ko)이 필요합니다.`);
    if (!place?.address?.ko) fail('content/site.json', `locations[${i}] 에 한국어 주소(address.ko)가 필요합니다.`);
  }
}

// ---------- 5. 나머지 파일 ----------
for (const name of ['site.json', 'about.json', 'programs.json', 'faq.json']) {
  const data = readJson(path.join(CONTENT, name), `content/${name}`);
  if (!data) continue;
  if (name === 'about.json' && !data.i18n?.ko) fail('content/about.json', '한국어("ko") 내용이 필요합니다.');
  if (name === 'about.json') {
    for (const [lang, body] of Object.entries(data.i18n ?? {})) {
      const codes = new Set((body?.sdgs ?? []).map((sdg) => sdg.code));
      for (const detail of body?.sdg_details ?? []) {
        if (!codes.has(detail?.code)) fail('content/about.json', `${lang}.sdg_details 의 code "${detail?.code}" 가 sdgs 목록에 없습니다.`);
        if (!detail?.title) fail('content/about.json', `${lang}.sdg_details(${detail?.code}) 에 제목(title)이 필요합니다.`);
      }
    }
  }
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
