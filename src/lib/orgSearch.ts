// 도움받을 곳 키워드 검색에서 검색어를 나누는 도구입니다. (OrgDirectory 에서 사용)
// 파일을 읽지 않는 "순수한 계산"이라 브라우저와 테스트(scripts/test-ask.mjs)에서 함께 씁니다.
//
//  1) 검색어에 시·도 이름이 있으면 그 지역을 찾아냅니다.   "부산에서 임금 문제" → 지역 부산
//     (content/regions.json 에 있는 17개 시·도 이름만, 4개 언어로 찾습니다. 동네 이름은 지역으로 바꾸지 않습니다)
//  2) 문장으로 적은 검색어에서 찾는 데 도움이 안 되는 말(도움받고, 싶어요, 문제 …)을 뺍니다.
//     기관 검색은 "남은 낱말이 모두 들어 있는 기관"을 찾기 때문에, 이런 말이 남아 있으면 아무것도 찾지 못합니다.
//
// 새 정보를 만들지 않고, 검색어를 나누기만 합니다.

import { REGIONS } from './regions';
import { normalize, stem } from './searchText';

/** 시·도 이름 뒤에 붙는 말 ("부산시", "경기도", "서울특별시", "부산 지역") */
const REGION_SUFFIXES = ['특별자치시', '특별자치도', '특별시', '광역시', '지역', '시', '도'];

/** 긴 이름으로 적은 시·도 ("충청북도" → 충북) */
const REGION_ALIASES: Record<string, string> = {
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
};

/** 문장에 자주 들어가지만 기관을 찾는 데는 쓰이지 않는 말 (normalize 한 모양, 소문자) */
const STOPWORDS = new Set([
  // 한국어
  '도움', '문제', '어디', '어디서', '어디에', '어디로', '어떻게', '곳', '기관', '관련', '대해', '대해서', '대한',
  '받고', '받을', '받고싶어요', '있나요', '있어요', '있을까요', '있는', '주세요', '알려주세요', '좀', '지금',
  '저', '제가', '저는', '나', '내가', '나는', '요', '수', '할', '하는', '필요해요', '필요한', '궁금해요', '찾고', '찾아요',
  // English
  'help', 'helps', 'want', 'wants', 'need', 'needs', 'i', 'im', 'me', 'my', 'to', 'with', 'in', 'on', 'at', 'a', 'an',
  'the', 'and', 'or', 'for', 'of', 'about', 'get', 'getting', 'where', 'can', 'could', 'how', 'do', 'does', 'is', 'are',
  'am', 'be', 'problem', 'problems', 'issue', 'issues', 'please', 'place', 'places', 'find', 'near', 'from', 'have',
  'has', 'what', 'who', 'which', 'some', 'someone',
  // Tiếng Việt
  'tôi', 'muốn', 'cần', 'giúp', 'đỡ', 'được', 'ở', 'tại', 'về', 'vấn', 'đề', 'có', 'không', 'nơi', 'nào', 'đâu',
  'cho', 'của', 'với', 'và', 'bị', 'tìm', 'xin', 'làm', 'sao', 'ai', 'gì', 'là',
]);

/** 이 말로 시작하면 뺍니다. ("도움받고", "도움받을", "싶어요", "싶은데") */
const STOP_PREFIXES = ['도움받', '싶', '알려주'];

/** 중국어는 띄어쓰기가 없어서 글자 묶음으로 뺍니다. (긴 것부터) */
const HAN_STOPWORDS = ['在哪里', '哪里', '帮助', '帮忙', '问题', '需要', '可以', '想要', '我', '在', '想', '要', '的', '了', '吗', '呢', '请'];

export interface ParsedOrgQuery {
  /** 검색어에서 찾은 시·도 (content/regions.json 의 key). 없으면 null */
  region: string | null;
  /** 시·도 이름과 찾는 데 쓰이지 않는 말을 뺀 검색어. 남은 말이 없으면 '' */
  text: string;
}

function isStopword(token: string): boolean {
  if (STOPWORDS.has(token) || STOPWORDS.has(stem(token))) return true;
  return STOP_PREFIXES.some((prefix) => token.startsWith(prefix));
}

/** 낱말 하나가 시·도 이름인지 확인하고, 맞으면 그 key 를 돌려줍니다. ("부산에서" → 부산) */
export function regionOfToken(token: string): string | null {
  const word = token.toLowerCase();
  const candidates = new Set([word, stem(word)]);
  for (const value of [...candidates]) {
    for (const suffix of REGION_SUFFIXES) {
      if (value.endsWith(suffix) && value.length > suffix.length + 1) candidates.add(value.slice(0, -suffix.length));
    }
  }
  for (const value of candidates) {
    if (REGION_ALIASES[value]) return REGION_ALIASES[value];
    const hit = REGIONS.find(
      (region) =>
        region.key === value ||
        Object.values(region.name).some((name) => name && !/\p{Script=Han}/u.test(name) && name.toLowerCase() === value),
    );
    if (hit) return hit.key;
  }
  return null;
}

/** 검색어를 지역과 나머지 낱말로 나눕니다. */
export function parseOrgQuery(query: string): ParsedOrgQuery {
  let q = normalize(query);
  let region: string | null = null;

  // 중국어 지역 이름 (띄어쓰기 없이 붙어 있어도 찾습니다: "我在釜山想咨询工资")
  for (const item of REGIONS) {
    const han = item.name.zh;
    if (han && q.includes(han)) {
      region ??= item.key;
      q = q.split(han).join(' ');
    }
  }

  const kept: string[] = [];
  for (const token of q.split(' ').filter(Boolean)) {
    const found = regionOfToken(token);
    if (found) {
      region ??= found;
      continue;
    }
    if (/\p{Script=Han}/u.test(token)) {
      // 중국어 문장: 찾는 데 쓰이지 않는 글자 묶음을 빼고 남은 조각을 낱말로 씁니다.
      let rest = token;
      for (const word of HAN_STOPWORDS) rest = rest.split(word).join(' ');
      kept.push(...rest.split(' ').filter(Boolean));
      continue;
    }
    if (!isStopword(token)) kept.push(token);
  }

  return { region, text: kept.join(' ') };
}
