'use client';

// AI 질문 화면입니다. 질문을 /api/ask 로 보내고, 돌아온 결과를 카드로 그립니다.
// OpenAI 키는 서버에만 있으므로 이 파일에는 키가 전혀 들어 있지 않습니다.
//
// 추가 질문: AI 답변 아래의 "추가 질문하기"로 이어서 물어보면
// 최근 대화(질문 + 답변)를 함께 보내 앞의 내용에 이어서 답하게 합니다.
// "새 질문"을 누르면 대화를 모두 지우고 처음 상태로 돌아갑니다.
//
// 답변 칸 순서 (내 상황 → 확인 → 권리 → 행동 → 도움 → 질문 하나 → 참고 자료):
//   ① 지금 상황 ② 먼저 확인할 것 ③ 내가 알아야 할 권리 ④ 지금 할 수 있는 일(가장 눈에 띄게)
//   ⑤ 도움받을 수 있는 곳 ⑥ 한 가지 확인 질문 ⑦ 참고 자료(함께 볼 권리정보·참고·확인한 정보)
// 내용이 없는 칸은 보여주지 않고, 번호는 보이는 칸끼리 차례로 매깁니다.
// 등록 자료를 찾지 못했거나 답변을 만들지 못했으면 "다음에 할 수 있는 일"(NoResultHelp)을 보여줍니다.
//
// 새로고침해도 대화가 사라지지 않게 하기
//   실수로 새로고침하거나 뒤로 갔다 와도 방금 받은 답변을 다시 볼 수 있도록,
//   지금까지의 대화를 이 탭의 임시 저장소(sessionStorage)에 담아 두고 화면을 다시 열 때 불러옵니다.
//   - 저장 범위: 지금 열려 있는 탭 하나뿐입니다. 탭을 닫으면 사라지고, 다른 탭·다른 기기에서는 보이지 않습니다.
//   - 서버에는 질문 내용을 저장하지 않습니다. (개인정보 처리방침과 같은 내용입니다)
//   - "새 질문"을 누르면 저장해 둔 대화도 함께 지웁니다.
//   - 저장하는 대화 수는 아래 MAX_SAVED_TURNS 개까지입니다.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PENDING_QUESTION_KEY } from './AskBox';
import { EmergencyCard } from './EmergencyCard';
import { Glossary } from './Glossary';
import { Helpful } from './Helpful';
import { Icon } from './Icon';
import { NoResultHelp } from './NoResultHelp';
import { OrgCard } from './OrgCard';
import { PrivacyNotice } from './PrivacyNotice';
import { findPersonalInfo, removePersonalInfo } from './privacy-detect';
import { matchGlossary, type GlossaryTerm } from '@/lib/glossary';
import { formatDate, getMessages, type Locale, type Messages } from '@/lib/i18n';
import type { AskApiRequest, AskApiResponse, AskHistoryTurn, Organization } from '@/lib/types';

const MAX_LENGTH = 500;
/** 추가 질문 때 함께 보내는 최근 대화 수 (서버에서도 같은 수로 한 번 더 제한합니다) */
const MAX_HISTORY_TURNS = 3;
/** 새로고침에 대비해 이 탭에 잠시 담아 두는 대화 수 */
const MAX_SAVED_TURNS = 3;
/** 이 탭에만 쓰는 임시 저장소 이름 (탭을 닫으면 사라집니다) */
const SAVED_TURNS_KEY = 'linkrights:ask-turns';

interface FallbackLink {
  id: string;
  title: string;
  href: string;
}

/** 화면에 쌓이는 대화 한 번: 사용자가 보낸 질문과 서버가 돌려준 결과 */
interface Turn {
  question: string;
  result: AskApiResponse;
}

/** 지금까지의 대화 중 AI가 답한 것만 골라, 서버로 보낼 이전 대화 모양으로 바꿉니다. */
function toHistory(turns: Turn[]): AskHistoryTurn[] {
  const history: AskHistoryTurn[] = [];
  for (const { question, result } of turns) {
    if (result.ok && result.mode === 'ai' && result.answer) {
      const { summary, rights, actions, follow_up_question, limitations } = result.answer;
      history.push({
        question,
        answer: {
          summary,
          rights: rights.map(({ title, body }) => ({ title, body })),
          actions,
          follow_up_question,
          limitations,
        },
      });
    }
  }
  return history.slice(-MAX_HISTORY_TURNS);
}

/** 이 탭에 담아 둔 대화를 읽어옵니다. 모양이 다르거나 읽을 수 없으면 빈 목록으로 시작합니다. */
function readSavedTurns(): Turn[] {
  try {
    const raw = window.sessionStorage.getItem(SAVED_TURNS_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as unknown;
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(
        (turn): turn is Turn =>
          typeof (turn as Turn)?.question === 'string' && typeof (turn as Turn)?.result?.ok === 'boolean',
      )
      .slice(-MAX_SAVED_TURNS);
  } catch {
    return [];
  }
}

/** 지금까지의 대화를 이 탭에 담아 둡니다. (서버로는 보내지 않습니다) */
function saveTurns(turns: Turn[]): void {
  try {
    if (turns.length === 0) window.sessionStorage.removeItem(SAVED_TURNS_KEY);
    else window.sessionStorage.setItem(SAVED_TURNS_KEY, JSON.stringify(turns.slice(-MAX_SAVED_TURNS)));
  } catch {
    // 임시 저장소를 쓸 수 없는 브라우저(개인정보 보호 모드 등)에서는 이 화면에서만 대화가 남습니다.
  }
}

function errorMessageOf(result: AskApiResponse, t: Messages): string | null {
  if (result.ok) return null;
  if (result.error === 'rate_limit') return t.ask.errorRateLimit;
  if (result.error === 'daily_limit') return t.ask.errorDailyLimit;
  if (result.error === 'too_long') return t.ask.errorTooLong;
  if (result.error === 'empty') return t.ask.errorEmpty;
  return t.ask.errorGeneric;
}

/**
 * 번호 동그라미. 화면에는 숫자만 보이고,
 * 화면낭독기와 글자 복사·추출에서는 "1. 상황을…"처럼 번호와 문장이 떨어져 읽힙니다.
 */
function StepNumber({ index }: { index: number }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[15px] font-bold text-white">
      {index + 1}
      <span className="sr-only">.</span>
    </span>
  );
}

/** 답변 칸 제목. 칸 번호(①②…)를 함께 보여줍니다. */
function PartHeading({
  n,
  title,
  strong = false,
  level = 'h3',
}: {
  n: number;
  title: string;
  strong?: boolean;
  level?: 'h2' | 'h3';
}) {
  const Tag = level;
  return (
    <Tag
      className={`flex items-center gap-2.5 text-ink-900 ${strong ? 'text-lg font-extrabold sm:text-xl' : 'text-base font-bold'}`}
    >
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[13px] font-bold text-white"
      >
        {n}
      </span>{' '}
      {title}
    </Tag>
  );
}

/** 서버가 돌려준 결과 하나(오류 · 긴급 안내 · AI 답변)를 그립니다. */
function ResultView({
  result,
  locale,
  t,
  feedbackId,
  onNewQuestion,
  onRetry,
  onAnswerFollowUp,
  onSuggestion,
  glossaryTerms = [],
  generalHelp = [],
  categoryNames = {},
}: {
  result: AskApiResponse;
  locale: Locale;
  t: Messages;
  /** "도움이 됐나요?" 를 답변마다 따로 기억하기 위한 이름 (질문 내용은 들어가지 않습니다) */
  feedbackId: string;
  onNewQuestion: () => void;
  /** 자료를 찾지 못했거나 답변을 만들지 못했을 때: 적었던 질문을 남겨 두고 고쳐 쓰게 합니다. */
  onRetry: () => void;
  /** 가장 최근 답변에만 넘깁니다. AI의 확인 질문에 바로 답할 수 있게 추가 질문 입력창으로 이동합니다. */
  onAnswerFollowUp?: () => void;
  /** 가장 최근 답변에만 넘깁니다. '이런 것도 물어볼 수 있어요'를 누르면 그 문장으로 이어서 물어봅니다. */
  onSuggestion?: (text: string) => void;
  /** 쉬운 말 풀이 용어 (content/glossary.json). 답변에 나온 용어만 골라 옆에 보여주며, 답변 내용은 바꾸지 않습니다. */
  glossaryTerms?: GlossaryTerm[];
  /** 누구나 이용할 수 있는 청소년 상담 기관 (등록 기관, 자료가 없을 때만 보여줌) */
  generalHelp?: Organization[];
  /** 분야 id → 이름 (자료가 없을 때 분야 링크에 사용) */
  categoryNames?: Record<string, string>;
}) {
  const errorMessage = errorMessageOf(result, t);
  const a = t.answerUi;
  const answer = result.ok && result.mode === 'ai' ? result.answer : null;
  const glossary = answer
    ? matchGlossary(
        glossaryTerms,
        [
          answer.summary,
          ...(answer.checks ?? []),
          ...answer.rights.flatMap((item) => [item.title, item.body]),
          ...answer.actions.flatMap((item) => [item.title, item.body]),
          answer.limitations,
        ],
        locale,
        locale,
      )
    : [];

  // 보이는 칸끼리 번호를 매깁니다.
  const parts: string[] = [];
  if (answer && result.ok) {
    parts.push('situation');
    if ((answer.checks ?? []).length > 0) parts.push('checks');
    if (answer.rights.length > 0) parts.push('rights');
    if (answer.actions.length > 0) parts.push('actions');
    if (result.organizations.length > 0) parts.push('orgs');
    if (answer.follow_up_question) parts.push('followUp');
    parts.push('references');
  }
  const n = (key: string) => parts.indexOf(key) + 1;
  const noEvidence = result.ok && result.evidence === 'none';
  const category =
    answer && categoryNames[answer.category]
      ? { href: `/${locale}/rights/${answer.category}`, name: categoryNames[answer.category] }
      : undefined;

  return (
    <>
      {errorMessage && (
        <div className="lr-appear space-y-4">
          <div className="lr-card border-[var(--color-warm-500)] bg-warm-100 p-5 sm:p-6">
            <p className="text-base font-semibold text-ink-900">{errorMessage}</p>
          </div>
          {/* 답변을 만들지 못했을 때도 다음에 할 수 있는 일을 보여줍니다. (입력 오류는 제외) */}
          {!result.ok && result.error !== 'too_long' && result.error !== 'empty' && (
            <NoResultHelp
              t={t}
              locale={locale}
              title={a.errorTitle}
              links={result.fallback ?? []}
              generalHelp={generalHelp}
              onRetry={onRetry}
            />
          )}
        </div>
      )}

      {result.ok && result.emergency && (
        <EmergencyCard
          locale={locale}
          title={result.emergency.title}
          message={result.emergency.message}
          steps={result.emergency.steps}
          note={result.emergency.note}
          organizations={result.organizations.filter((org) => org.emergency)}
        />
      )}

      {result.ok && answer && (
        <article className="lr-card lr-appear overflow-hidden">
          {/* ① 지금 상황 */}
          <div className="border-b border-[var(--color-line)] bg-surface-soft px-5 py-5 sm:px-7 sm:py-6">
            <PartHeading n={n('situation')} title={a.situation} level="h2" />
            <p className="mt-2.5 text-[17px] leading-relaxed text-ink-900">{answer.summary}</p>
            {result.evidence === 'possible' && (
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-500">
                <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-brand-600" />{' '}
                <span>{t.ask.evidencePossibleNote}</span>
              </p>
            )}
          </div>

          <div className="space-y-9 px-5 py-6 sm:px-7 sm:py-8">
            {/* ② 먼저 확인할 것 */}
            {(answer.checks ?? []).length > 0 && (
              <section>
                <PartHeading n={n('checks')} title={a.checks} />
                <ul className="mt-3 space-y-2">
                  {(answer.checks ?? []).map((item, index) => (
                    <li
                      key={index}
                      className="flex gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white px-4 py-3 text-[15px] leading-relaxed text-ink-900"
                    >
                      <Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand-600" /> <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ③ 내가 알아야 할 권리 (근거 자료가 있을 때만) */}
            {answer.rights.length > 0 && (
              <section>
                <PartHeading n={n('rights')} title={a.rights} />
                <ul className="mt-4 space-y-3">
                  {answer.rights.map((item, index) => (
                    <li key={index} className="lr-callout">
                      <p className="text-base font-bold text-ink-900">{item.title}</p>{' '}
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ④ 지금 할 수 있는 일: 답변에서 가장 중요한 칸이므로 가장 눈에 띄게 */}
            {answer.actions.length > 0 && (
              <section className="rounded-[var(--radius-card)] border-2 border-navy-900 bg-white p-5 sm:p-6">
                <PartHeading n={n('actions')} title={a.actions} strong />
                <p className="mt-1.5 text-sm text-ink-500">{a.actionsNote}</p>
                <ol className="mt-4 space-y-4">
                  {answer.actions.map((item, index) => (
                    <li key={index} className="flex gap-3.5">
                      <StepNumber index={index} />{' '}
                      <span className="min-w-0 pt-0.5">
                        <span className="block text-base font-bold text-ink-900">{item.title}</span>{' '}
                        <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-700">{item.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* 어려운 말 풀이: 답변에 나온 전문 용어 옆에 쉬운 설명 (등록 용어만, 새로운 근거나 내용은 더하지 않습니다) */}
            <Glossary items={glossary} title={t.glossary.title} />

            {/* 등록 자료를 찾지 못했을 때: 비슷한 권리정보·분야·지역별 도움받을 곳·청소년 상담·다시 묻기 */}
            {noEvidence && (
              <NoResultHelp
                t={t}
                locale={locale}
                title={a.noEvidenceTitle}
                body={a.noEvidenceBody}
                links={result.related ?? []}
                category={category}
                generalHelp={generalHelp}
                onRetry={onRetry}
              />
            )}

            {/* ⑤ 도움받을 수 있는 곳 (근거 자료와 연결된 기관이 있을 때만) */}
            {result.organizations.length > 0 && (
              <section>
                <PartHeading n={n('orgs')} title={a.orgs} />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {result.organizations.map((org) => (
                    <OrgCard key={org.id} org={org} locale={locale} compact />
                  ))}
                </div>
              </section>
            )}

            {/* ⑥ 한 가지 확인 질문: 안내를 모두 한 뒤, 정말 필요할 때만 질문 하나 */}
            {answer.follow_up_question && (
              <section className="rounded-[var(--radius-control)] border border-brand-200 bg-brand-50 p-4 sm:p-5">
                <PartHeading n={n('followUp')} title={a.followUp} />
                <p className="mt-2 text-base font-semibold leading-relaxed text-ink-900">{answer.follow_up_question}</p>
                <p className="mt-1 text-sm text-ink-500">{a.followUpNote}</p>
                {onAnswerFollowUp && (
                  <button type="button" onClick={onAnswerFollowUp} className="lr-btn lr-btn-ghost lr-btn-sm mt-3">
                    {t.ask.answerFollowUp} <Icon name="arrow-right" size={16} />
                  </button>
                )}
              </section>
            )}

            {/* 이어서 물어볼 수 있는 질문: 등록된 권리정보에 적혀 있는 문장만 보여주고, 누르면 그대로 추가 질문이 됩니다. */}
            {onSuggestion && result.suggestions && result.suggestions.length > 0 && (
              <section>
                <p className="text-[15px] font-bold text-ink-900">{t.ask.suggestTitle}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {result.suggestions.map((text) => (
                    <li key={text}>
                      <button
                        type="button"
                        onClick={() => onSuggestion(text)}
                        className="lr-press rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-left text-[15px] text-ink-700 transition hover:border-brand-600 hover:text-brand-700"
                      >
                        {text}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ⑦ 참고 자료 */}
            <section className="space-y-5 border-t border-[var(--color-line)] pt-6">
              <PartHeading n={n('references')} title={a.references} />

              {/* 상황에 따라 함께 볼 수 있는 권리정보 (등록 페이지 링크만) */}
              {!noEvidence && result.related && result.related.length > 0 && (
                <div>
                  <p className="text-[15px] font-bold text-ink-900">{t.ask.relatedTitle}</p>
                  <ul className="mt-2 space-y-2">
                    {result.related.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} className="lr-link inline-flex items-center gap-1.5 text-[15px] font-semibold">
                          {item.title} <Icon name="arrow-right" size={16} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 참고해 주세요 */}
              {answer.limitations && (
                <div className="rounded-[var(--radius-control)] border border-[var(--color-warm-500)] bg-warm-100 p-4">
                  <p className="text-[15px] font-bold text-ink-900">{t.ask.resultLimitations}</p>{' '}
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{answer.limitations}</p>
                </div>
              )}

              {/* 확인한 정보: 실제로 사용한 등록 자료의 제목, 검토일, 발행기관과 공식 링크 */}
              {result.sources.length > 0 && (
                <div>
                  <p className="text-[15px] font-bold text-ink-900">{t.ask.resultSources}</p>
                  <ul className="mt-2 space-y-3">
                    {result.sources.map((source) => (
                      <li key={source.id} className="text-[15px]">
                        <Link href={source.href} className="lr-link font-semibold">
                          {source.title}
                        </Link>{' '}
                        <p className="mt-0.5 text-[13px] text-ink-500">
                          {t.common.reviewedAt} {formatDate(source.reviewed_at, locale)}
                        </p>
                        {source.sources.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {source.sources.map((official) => (
                              <li key={official.url} className="text-[13px] leading-relaxed text-ink-500">
                                {official.publisher && <span>{official.publisher} · </span>}
                                <a
                                  href={official.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`${official.title} (${t.common.openInNew})`}
                                  className="underline underline-offset-2 hover:text-brand-700"
                                >
                                  {official.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[13px] leading-relaxed text-ink-500">{t.ask.disclaimer}</p>
            </section>

            {/* 이 답변이 도움이 되었나요? — 눌러주신 것만 익명으로 세어 봅니다. (질문·답변 내용은 보내지 않습니다) */}
            <div className="border-t border-[var(--color-line)] pt-6">
              <Helpful
                locale={locale}
                kind="ai"
                id={feedbackId}
                topic={answer.category}
                evidence={result.evidence}
              />
            </div>
          </div>
        </article>
      )}

      {result.ok && result.mode === 'emergency' && (
        <div className="lr-card p-5 sm:p-6">
          <p className="text-[15px] leading-relaxed text-ink-700">{t.ask.disclaimer}</p>
          <button type="button" onClick={onNewQuestion} className="lr-btn lr-btn-ghost mt-3">
            {t.ask.newQuestion}
          </button>
        </div>
      )}
    </>
  );
}

export function AskClient({
  locale,
  examples,
  initialQuestion,
  fallbackLinks,
  glossaryTerms = [],
  generalHelp = [],
  categoryNames = {},
}: {
  locale: Locale;
  examples: string[];
  initialQuestion: string;
  fallbackLinks: FallbackLink[];
  /** 쉬운 말 풀이 용어 (content/glossary.json) */
  glossaryTerms?: GlossaryTerm[];
  /** 누구나 이용할 수 있는 청소년 상담 기관 (content/organizations.json 의 청소년 상담 기관) */
  generalHelp?: Organization[];
  /** 분야 id → 이름 */
  categoryNames?: Record<string, string>;
}) {
  const t = getMessages(locale);
  const [question, setQuestion] = useState(initialQuestion);
  const [followUp, setFollowUp] = useState('');
  /** 지금 보내는 중인 질문의 종류. 'new' = 처음 질문, 'followUp' = 추가 질문 */
  const [pending, setPending] = useState<'new' | 'followUp' | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  /** 새로고침 뒤에 이전 대화를 다시 불러왔는지 (한 번만 알려줍니다) */
  const [restored, setRestored] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const followUpRef = useRef<HTMLTextAreaElement>(null);
  /** 개인정보로 보이는 내용 확인 (보내기 전에 한 번 멈추는 간단한 확인) */
  const questionMatches = useMemo(() => findPersonalInfo(question), [question]);
  const followUpMatches = useMemo(() => findPersonalInfo(followUp), [followUp]);
  const [blockedField, setBlockedField] = useState<'question' | 'followUp' | null>(null);
  const questionNoticeRef = useRef<HTMLDivElement>(null);
  const followUpNoticeRef = useRef<HTMLDivElement>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(false);
  /**
   * "도움이 됐나요?" 를 답변마다 구분하기 위한 이름입니다.
   * 화면을 열 때 한 번 정해지는 숫자일 뿐이며, 질문 내용이나 누구인지와는 아무 관계가 없습니다.
   */
  const sessionIdRef = useRef(`${Date.now().toString(36)}`);
  const loading = pending !== null;

  /**
   * 질문을 보냅니다.
   * isFollowUp 이 false 면 새 대화를 시작하고, true 면 지금까지의 대화에 이어서 묻습니다.
   */
  async function ask(text: string, isFollowUp = false) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const previousTurns = isFollowUp ? turns : [];
    const history = toHistory(previousTurns);
    // 최초 질문은 질문과 언어만 보냅니다.
    const payload: AskApiRequest =
      history.length > 0 ? { question: trimmed, locale, history } : { question: trimmed, locale };

    setPending(isFollowUp ? 'followUp' : 'new');
    if (!isFollowUp) setTurns([]);

    let result: AskApiResponse;
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      result = (await response.json()) as AskApiResponse;
    } catch {
      result = { ok: false, error: 'server', fallback: fallbackLinks };
    }

    const nextTurns = [...previousTurns, { question: trimmed, result }];
    setTurns(nextTurns);
    // 새로고침해도 방금 받은 답변을 다시 볼 수 있도록 이 탭에 담아 둡니다.
    saveTurns(nextTurns);
    setRestored(false);
    // 추가 질문이 잘 전달됐으면 입력창을 비웁니다. 실패했으면 다시 보낼 수 있도록 남겨 둡니다.
    if (isFollowUp && result.ok) setFollowUp('');
    setPending(null);
  }

  /** 대화를 모두 지우고 처음 질문 상태로 돌아갑니다. (담아 둔 대화도 함께 지웁니다) */
  function startNewQuestion() {
    setTurns([]);
    saveTurns([]);
    setRestored(false);
    setQuestion('');
    setFollowUp('');
    questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    questionRef.current?.focus({ preventScroll: true });
  }

  /** 답을 찾지 못했을 때: 결과만 지우고 적었던 질문은 남겨 둔 채 입력창으로 이동해 고쳐 쓸 수 있게 합니다. */
  function retryQuestion() {
    setTurns([]);
    saveTurns([]);
    setRestored(false);
    setFollowUp('');
    questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    questionRef.current?.focus({ preventScroll: true });
    questionRef.current?.select();
  }

  /** '이런 것도 물어볼 수 있어요'를 누르면 그 문장을 추가 질문으로 바로 보냅니다. */
  function askSuggestion(text: string) {
    setFollowUp(text);
    void ask(text, true);
  }

  /** AI의 확인 질문에 답할 수 있도록 추가 질문 입력창으로 이동합니다. */
  function focusFollowUp() {
    followUpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    followUpRef.current?.focus({ preventScroll: true });
  }

  /** 보내기 전에 개인정보로 보이는 내용이 있으면 멈추고 안내합니다. 없으면 바로 보냅니다. */
  function submitChecked(isFollowUp: boolean) {
    const text = isFollowUp ? followUp : question;
    if (findPersonalInfo(text).length > 0) {
      setBlockedField(isFollowUp ? 'followUp' : 'question');
      return;
    }
    void ask(text, isFollowUp);
  }

  /** 개인정보로 보이는 부분을 지우고, send 가 true 면 바로 보냅니다. */
  function removePrivate(isFollowUp: boolean, send: boolean) {
    const cleaned = removePersonalInfo(isFollowUp ? followUp : question);
    if (isFollowUp) setFollowUp(cleaned);
    else setQuestion(cleaned);
    setBlockedField(null);
    if (send && cleaned) void ask(cleaned, isFollowUp);
    else (isFollowUp ? followUpRef : questionRef).current?.focus();
  }

  useEffect(() => {
    if (blockedField === 'question') questionNoticeRef.current?.focus();
    if (blockedField === 'followUp') followUpNoticeRef.current?.focus();
  }, [blockedField]);

  // 홈 입력창에서 넘어온 질문을 자동으로 한 번 물어봅니다.
  // 질문은 주소(URL) 대신 이 탭의 임시 저장소로 넘어오며, 읽자마자 지웁니다.
  // 예전 방식의 ?q= 주소로 들어온 경우에도 동작하고, 주소에서는 질문을 지웁니다.
  useEffect(() => {
    if (askedRef.current) return;
    let pendingQuestion = '';
    try {
      pendingQuestion = window.sessionStorage.getItem(PENDING_QUESTION_KEY) ?? '';
      window.sessionStorage.removeItem(PENDING_QUESTION_KEY);
    } catch {
      // 임시 저장소를 쓸 수 없는 브라우저에서는 주소로 넘어온 질문만 사용합니다.
    }
    if (initialQuestion) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    const text = (pendingQuestion || initialQuestion).slice(0, MAX_LENGTH);
    if (text) {
      askedRef.current = true;
      setQuestion(text);
      void ask(text);
      return;
    }
    // 새로 물어본 질문이 없으면, 새로고침 전에 하던 대화를 다시 불러옵니다.
    const saved = readSavedTurns();
    if (saved.length > 0) {
      askedRef.current = true;
      setTurns(saved);
      setRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  // 새 결과가 오면 그 결과가 시작되는 곳으로 화면을 옮기고, 초점도 옮겨 화면낭독기가 읽게 합니다.
  // 새로고침 뒤 예전 대화를 불러온 경우에는, 이용자가 움직이지 않았는데 화면이 뛰지 않도록 그대로 둡니다.
  useEffect(() => {
    if (restored) return;
    if (turns.length > 0 && latestTurnRef.current) {
      latestTurnRef.current.focus({ preventScroll: true });
      latestTurnRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [turns, restored]);

  const lastResult = turns.length > 0 ? turns[turns.length - 1].result : null;
  // AI 답변을 한 번 이상 받았고, 마지막 결과가 긴급 안내가 아닐 때만 추가 질문을 받습니다.
  const canFollowUp =
    turns.some((turn) => turn.result.ok && turn.result.mode === 'ai') &&
    !(lastResult?.ok && lastResult.mode === 'emergency');

  return (
    <div className="lr-container-narrow py-8 sm:py-12">
      {/* 내 상황 적기 */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitChecked(false);
        }}
        className="lr-card p-5 sm:p-7"
      >
        <label htmlFor="question" className="block">
          <span className="block text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
            {t.ask.questionHeading}
          </span>{' '}
          <span className="mt-1.5 block text-[15px] leading-relaxed text-ink-500">{t.ask.questionHint}</span>
        </label>
        {/* 개인정보 입력 금지 안내: 쓰기 전에 먼저 보이도록 입력창 위에 둡니다 (탐지 로직은 privacy-detect.ts 그대로) */}
        <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] bg-brand-50 px-3 py-2 text-sm font-medium leading-relaxed text-brand-800">
          <Icon name="shield" size={16} className="mt-0.5 shrink-0" /> <span>{t.ask.privacyShort}</span>
        </p>
        <textarea
          ref={questionRef}
          id="question"
          value={question}
          maxLength={MAX_LENGTH}
          rows={5}
          onChange={(event) => {
            setQuestion(event.target.value);
            if (blockedField === 'question') setBlockedField(null);
          }}
          placeholder={t.ask.placeholder}
          className="lr-input mt-3 resize-y"
        />
        <PrivacyNotice
          t={t}
          matches={questionMatches}
          blocked={blockedField === 'question'}
          noticeRef={questionNoticeRef}
          onRemove={() => removePrivate(false, false)}
          onRemoveAndSend={() => removePrivate(false, true)}
          onEdit={() => {
            setBlockedField(null);
            questionRef.current?.focus();
          }}
        />
        <div className="mt-5 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-sm text-ink-500 sm:text-left">
            {MAX_LENGTH - question.length} {t.ask.charsLeft}
          </span>
          <button type="submit" disabled={loading || !question.trim()} className="lr-btn lr-btn-primary lr-btn-lg">
            {pending === 'new' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t.ask.sending}
              </>
            ) : (
              <>
                {t.ask.submitFirst} <Icon name="arrow-right" size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      {turns.length === 0 && !loading && examples.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-500">{t.home.exampleLabel}</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {examples.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setQuestion(example);
                    void ask(example);
                  }}
                  className="rounded-full border border-[var(--color-line)] bg-white px-3.5 py-2 text-left text-[15px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 새로고침 뒤 예전 대화를 다시 불러왔을 때 알려줍니다. */}
      {restored && turns.length > 0 && (
        <p
          role="status"
          className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-control)] border border-brand-200 bg-brand-50 px-4 py-3 text-[15px] leading-relaxed text-brand-800"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <Icon name="check" size={16} className="shrink-0" /> {t.ask.sessionRestored}
          </span>
          <button type="button" onClick={startNewQuestion} className="lr-link font-semibold">
            {t.ask.clearConversation}
          </button>
        </p>
      )}

      <div aria-live="polite" className="mt-8 space-y-6 outline-none">
        {turns.map((turn, index) => (
          <div
            key={index}
            ref={index === turns.length - 1 ? latestTurnRef : undefined}
            tabIndex={-1}
            className="space-y-6 outline-none"
          >
            {/* 추가 질문은 무엇을 물었는지 답변 위에 함께 보여줍니다. (처음 질문은 위 입력창에 있습니다) */}
            {index > 0 && (
              <div className="rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 px-5 py-4">
                <p className="text-sm font-bold text-brand-800">{t.ask.myQuestion}</p>{' '}
                <p className="mt-1 text-base leading-relaxed text-ink-900">{turn.question}</p>
              </div>
            )}
            <ResultView
              glossaryTerms={glossaryTerms}
              generalHelp={generalHelp}
              categoryNames={categoryNames}
              result={turn.result}
              locale={locale}
              t={t}
              feedbackId={`${sessionIdRef.current}-${index}`}
              onNewQuestion={startNewQuestion}
              onRetry={retryQuestion}
              onAnswerFollowUp={index === turns.length - 1 && canFollowUp && !loading ? focusFollowUp : undefined}
              onSuggestion={index === turns.length - 1 && canFollowUp && !loading ? askSuggestion : undefined}
            />
          </div>
        ))}

        {loading && (
          <div className="lr-card p-7 text-center text-[15px] text-ink-500">
            <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            {t.ask.sending}
          </div>
        )}

        {canFollowUp && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitChecked(true);
            }}
            className="lr-card p-5 sm:p-6"
          >
            <label htmlFor="follow-up-question" className="block text-base font-bold text-ink-900">
              {t.ask.followUpTitle}
            </label>
            <textarea
              ref={followUpRef}
              id="follow-up-question"
              value={followUp}
              maxLength={MAX_LENGTH}
              rows={3}
              onChange={(event) => {
                setFollowUp(event.target.value);
                if (blockedField === 'followUp') setBlockedField(null);
              }}
              placeholder={t.ask.followUpPlaceholder}
              className="lr-input mt-3 resize-y"
            />
            <PrivacyNotice
              t={t}
              matches={followUpMatches}
              blocked={blockedField === 'followUp'}
              noticeRef={followUpNoticeRef}
              onRemove={() => removePrivate(true, false)}
              onRemoveAndSend={() => removePrivate(true, true)}
              onEdit={() => {
                setBlockedField(null);
                followUpRef.current?.focus();
              }}
            />
            {/* 휴대폰에서는 글자 수 아래에 버튼 두 개가 나란히, 넓은 화면에서는 한 줄로 보입니다.
                화면이 아주 좁으면 버튼 글자가 꺾이지 않고 버튼이 다음 줄로 내려갑니다. */}
            <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <span className="text-sm text-ink-500">
                {MAX_LENGTH - followUp.length} {t.ask.charsLeft}
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startNewQuestion} disabled={loading} className="lr-btn lr-btn-ghost">
                  {t.ask.newConversation}
                </button>
                <button
                  type="submit"
                  disabled={loading || !followUp.trim()}
                  className="lr-btn lr-btn-primary"
                >
                  {pending === 'followUp' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {t.ask.sending}
                    </>
                  ) : (
                    <>
                      <Icon name="sparkles" size={18} /> {t.ask.submit}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 이 대화가 어디에 남는지 솔직하게 알려줍니다. (탭 안에서만 유지되고 서버에는 저장하지 않습니다) */}
            <p className="mt-4 flex items-start gap-2 border-t border-[var(--color-line)] pt-4 text-[13px] leading-relaxed text-ink-500">
              <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-brand-600" />{' '}
              <span>
                <strong className="font-semibold text-ink-700">{t.ask.sessionTitle}</strong> {t.ask.sessionBody}
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
