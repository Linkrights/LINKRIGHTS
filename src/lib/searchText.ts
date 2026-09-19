// 검색에서 글자를 비교할 때 쓰는 도구들입니다.
//
// 여기 있는 함수들은 파일을 읽지 않는 "순수한 계산"이라서
// 서버(권리정보 검색, AI 근거 찾기 — search.ts)와 브라우저(기관 키워드 검색 — OrgDirectory)에서 함께 씁니다.
// 원래 search.ts 안에 있던 코드를 그대로 옮긴 것이며, 비교하는 방법은 달라지지 않았습니다.
//
// 한국어는 조사·어미가 붙어 같은 말이 여러 모양으로 나오기 때문에
// ("비자를" / "비자는" / "연장하고" / "연장했어요") 끝부분을 정리한 뒤 비교합니다.

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[.,!?;:()[\]{}"'`~/\\|<>@#$%^&*_+=-]/g, ' ')
    .trim();
}

/**
 * 한국어 조사·어미 규칙입니다. [끝부분, 바꿀 글자] 이며 긴 것부터 확인합니다.
 *  - "이라서 / 이라는 / 이라고" 는 모두 "이라" 로 맞춥니다.
 *    ("외국인이라는" 과 "외국인이라서" 는 같은 말로 보지만, "외국인도" 와는 다른 말로 봅니다)
 *  - "하고 / 해요 / 했" 같은 '하다' 활용은 "하" 로 맞춥니다. ("연장하고" → "연장하")
 *  - 조사("를", "에서" 등)는 떼어냅니다. ("비자를" → "비자")
 */
const ENDING_RULES: [string, string][] = [
  ['했어요', '하'],
  ['했는데', '하'],
  ['하는데', '하'],
  ['이라서', '이라'],
  ['이라는', '이라'],
  ['이라고', '이라'],
  ['에서는', ''],
  ['에게서', ''],
  ['으로는', ''],
  ['하고', '하'],
  ['해서', '하'],
  ['해요', '하'],
  ['하는', '하'],
  ['하게', '하'],
  ['했다', '하'],
  ['한다', '하'],
  ['라서', '이라'],
  ['라는', '이라'],
  ['라고', '이라'],
  ['에서', ''],
  ['에게', ''],
  ['한테', ''],
  ['으로', ''],
  ['이랑', ''],
  ['까지', ''],
  ['부터', ''],
  ['처럼', ''],
  ['보다', ''],
  ['는데', ''],
  ['했', '하'],
  ['해', '하'],
  ['은', ''],
  ['는', ''],
  ['이', ''],
  ['가', ''],
  ['을', ''],
  ['를', ''],
  ['에', ''],
  ['의', ''],
  ['도', ''],
  ['만', ''],
  ['과', ''],
  ['와', ''],
  ['로', ''],
  ['랑', ''],
];

/** 조사·어미를 한 번 정리합니다. 남는 글자가 minLength 보다 짧아지면 그대로 둡니다. */
export function stem(token: string, minLength = 2): string {
  for (const [ending, replacement] of ENDING_RULES) {
    if (token.endsWith(ending) && token.length - ending.length >= minLength) {
      return token.slice(0, token.length - ending.length) + replacement;
    }
  }
  return token;
}

/** 질문의 단어 하나가 키워드 조각과 같은 말인지 확인합니다. (조사·어미 차이는 같은 말로 봅니다) */
export function sameWord(token: string, part: string): boolean {
  if (token === part) return true;
  // "돈을" = "돈" 처럼 한 글자 낱말은 조사만 뗀 모양이 같을 때만 같은 말로 봅니다.
  if (part.length === 1) return stem(token, 1) === part;
  const partStem = stem(part);
  const tokenStem = stem(token);
  // "무시해요" = "무시" 처럼 명사 + '하다' 는 같은 말로 봅니다.
  return tokenStem === partStem || tokenStem === `${partStem}하`;
}

/**
 * 표현의 한 낱말이 질문의 낱말과 맞는지: 같거나, 조사·어미만 다르거나, 그 낱말로 시작합니다. ("끝나" ↔ "끝나요")
 * 한 글자 낱말("안", "싫")은 "안전", "안내"처럼 다른 말로 이어지지 않도록 짧은 활용("싫어요", "줘요")까지만 맞춥니다.
 */
export function partMatches(token: string, part: string): boolean {
  if (token === part || sameWord(token, part)) return true;
  if (!token.startsWith(part)) return false;
  return part.length >= 2 || token.length <= part.length + 2;
}

export function compact(text: string): string {
  return text.replace(/\s+/g, '');
}

/** 한글·영문·베트남어처럼 띄어쓰기로 낱말을 나누는 표현인지 (중국어는 띄어쓰기가 없어 낱말 경계를 보지 않습니다) */
export function needsWordStart(term: string): boolean {
  return /^[\p{Script=Hangul}\p{Script=Latin}0-9]/u.test(term);
}

/** text 안에서 term 이 낱말의 시작 위치에 나오는지. ("용돈을 안 줘"의 "돈을 안 줘"는 낱말 중간이라 맞지 않습니다) */
export function includesAtWordStart(text: string, term: string, wordStarts?: boolean[]): boolean {
  if (!needsWordStart(term)) return text.includes(term);
  for (let index = text.indexOf(term); index !== -1; index = text.indexOf(term, index + 1)) {
    const atStart = wordStarts ? wordStarts[index] : index === 0 || text[index - 1] === ' ';
    if (atStart) return true;
  }
  return false;
}

/** 표현(한 낱말 또는 여러 낱말)이 질문에 낱말 단위로 들어 있는지 확인합니다. */
export function termInQuery(term: string, q: string, tokens: string[]): boolean {
  const normalized = normalize(term);
  if (!normalized) return false;
  // 띄어쓰기가 없는 중국어는 글자 그대로 찾습니다.
  if (/\p{Script=Han}/u.test(normalized)) return q.includes(normalized);
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 1) return tokens.some((token) => sameWord(token, parts[0]));
  let from = 0;
  for (const part of parts) {
    const index = tokens.findIndex((token, i) => i >= from && partMatches(token, part));
    if (index === -1) return false;
    from = index + 1;
  }
  return true;
}

/** 검색용 유사 표현 묶음 (content/search-synonyms.json 의 groups 와 같은 모양) */
export interface TermGroup {
  id: string;
  terms: string[];
}

/** 질문에 들어 있는 표현과 같은 묶음의 다른 표현들을 돌려줍니다. (검색용) */
export function expandWithGroups(query: string, groups: TermGroup[]): string[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const added = new Set<string>();
  for (const group of groups) {
    const present = group.terms.filter((term) => termInQuery(term, q, tokens));
    if (present.length === 0) continue;
    for (const term of group.terms) {
      if (!present.includes(term)) added.add(term);
    }
  }
  return [...added];
}

/**
 * 검색어가 어떤 글 안에 들어 있는지 확인합니다. (기관 키워드 검색에서 사용)
 * 검색어의 낱말이 모두 들어 있어야 맞은 것으로 봅니다. ("서울 청소년" → 둘 다 있는 기관)
 * 낱말 하나하나는 글자 그대로, 또는 조사·어미만 다른 모양으로 찾습니다.
 */
export function textMatchesQuery(haystack: string, query: string): boolean {
  const text = normalize(haystack);
  if (!text) return false;
  const q = normalize(query);
  if (!q) return true;
  const textTokens = text.split(' ').filter(Boolean);
  const queryTokens = q.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return true;
  return queryTokens.every((token) => {
    if (text.includes(token)) return true;
    const rooted = stem(token);
    if (rooted.length > 1 && text.includes(rooted)) return true;
    return textTokens.some((word) => sameWord(word, token) || partMatches(word, token));
  });
}
