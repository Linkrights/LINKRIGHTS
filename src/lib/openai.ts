// OpenAI 연결을 담당하는 단 하나의 파일입니다.
// 나중에 다른 AI 서비스로 바꾸고 싶다면 이 파일만 고치면 됩니다.
//
// 중요: API 키(OPENAI_API_KEY)는 이 파일에서만 사용하며,
// 이 코드는 서버에서만 실행되므로 브라우저로 키가 전달되지 않습니다.

import type { AiAnswer, Locale, Organization, RightsArticle } from './types';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 25000;

function model(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
}

/**
 * AI가 지켜야 할 규칙입니다. (영어로 쓰면 같은 내용도 토큰이 적게 들어 비용이 절약됩니다.)
 *
 * 한국어 요약:
 *  - 아래에 주어진 자료(CONTEXT)에 있는 내용만 사용한다.
 *  - 기관명, 전화번호, 주소, 링크를 절대로 지어내지 않는다.
 *  - 근거가 없으면 모른다고 말하고 공식기관에 확인하라고 안내한다.
 *  - 사용자가 쓴 언어와 같은 언어로, 청소년이 이해할 쉬운 말로 답한다.
 *  - 비자 승인 보장, 의료 진단, 법률 최종 판단을 하지 않는다.
 */
const SYSTEM_PROMPT = `You are the information guide for LINKRIGHTS, a rights-information site for migrant-background teenagers living in Korea.

GROUNDING RULES (most important)
- Use ONLY the CONTEXT given in the user message. Do not use outside knowledge to state facts.
- NEVER invent organisation names, phone numbers, addresses, office hours or URLs.
- "organizations" must contain only ids from ALLOWED_ORGANIZATION_IDS. Return [] if none fit.
- "sources" must contain only article ids that appear in CONTEXT. Return [] if you used none.
- If CONTEXT does not cover the question, say so plainly in "limitations", keep "rights" and "actions" short and general, and point the user to an organisation from ALLOWED_ORGANIZATION_IDS.
- Never guarantee a visa outcome, never diagnose illness, never give a final legal judgement.

STYLE
- Reply in the SAME language the user wrote in. If unsure, use Korean.
- Write for a 15-year-old who is still learning Korean: short sentences, everyday words, no legal jargon.
- Be warm and direct. Never blame the user.
- "summary": 1-2 sentences describing their situation back to them.
- "rights": at most 3 items. "actions": at most 4 items, each a concrete next step.
- Each "body" is at most 2 short sentences.
- "follow_up_question": one short question that would make the answer more accurate, or "" if not needed.
- "limitations": what still needs checking with an official body. Keep it to one sentence. Do not repeat a disclaimer in every other field.

URGENCY
- Set "urgency" to "urgent" only when the person may be in immediate physical danger (violence, abuse, threat, self-harm). Otherwise "normal".`;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: { type: 'string' },
    urgency: { type: 'string', enum: ['normal', 'urgent'] },
    summary: { type: 'string' },
    rights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, body: { type: 'string' } },
        required: ['title', 'body'],
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, body: { type: 'string' } },
        required: ['title', 'body'],
      },
    },
    organizations: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    follow_up_question: { type: 'string' },
    limitations: { type: 'string' },
  },
  required: [
    'category',
    'urgency',
    'summary',
    'rights',
    'actions',
    'organizations',
    'sources',
    'follow_up_question',
    'limitations',
  ],
} as const;

/** AI에게 보낼 참고자료를 짧게 정리합니다. 길수록 비용이 늘어나므로 꼭 필요한 것만 담습니다. */
export function buildContext(
  articles: RightsArticle[],
  locale: Locale,
  organizations: Organization[],
  categoryIds: string[],
): string {
  const blocks = articles.map((article) => {
    const body = article.i18n[locale] ?? article.i18n.ko;
    const lines = [
      `[ARTICLE id=${article.id} category=${article.category} reviewed=${article.reviewed_at}]`,
      `TITLE: ${body.title}`,
      `SUMMARY: ${body.summary}`,
      `SITUATIONS: ${body.situations.join(' | ')}`,
      `RIGHTS: ${body.rights.map((r) => `${r.title} - ${r.body}`).join(' | ')}`,
      `ACTIONS: ${body.actions.map((a) => `${a.title} - ${a.body}`).join(' | ')}`,
      `LINKED_ORG_IDS: ${article.organizations.join(', ')}`,
    ];
    if (body.note) lines.push(`NOTE: ${body.note}`);
    return lines.join('\n');
  });

  const orgLines = organizations.map((o) => `${o.id} | ${o.name.ko}${o.phone ? ` | tel ${o.phone}` : ''}`);

  return [
    'CONTEXT (the only material you may use):',
    blocks.length ? blocks.join('\n\n') : '(no matching article found)',
    '',
    'ALLOWED_ORGANIZATION_IDS (you may return only these ids):',
    orgLines.join('\n'),
    '',
    `ALLOWED_CATEGORY_IDS: ${categoryIds.join(', ')}, other`,
  ].join('\n');
}

export async function askOpenAi(params: {
  question: string;
  context: string;
}): Promise<AiAnswer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[linkrights] OPENAI_API_KEY 가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model(),
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${params.context}\n\nUSER QUESTION:\n${params.question}` },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'linkrights_answer', strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[linkrights] OpenAI 응답 오류', response.status, detail.slice(0, 500));
      return null;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as AiAnswer;
    return parsed;
  } catch (error) {
    console.error('[linkrights] OpenAI 호출 실패', error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
