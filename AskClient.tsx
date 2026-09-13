'use client';

// AI 질문 화면입니다. 질문을 /api/ask 로 보내고, 돌아온 결과를 카드로 그립니다.
// OpenAI 키는 서버에만 있으므로 이 파일에는 키가 전혀 들어 있지 않습니다.
//
// 추가 질문: AI 답변 아래의 "추가 질문하기"로 이어서 물어보면
// 최근 대화(질문 + 답변)를 함께 보내 앞의 내용에 이어서 답하게 합니다.
// "새 질문"을 누르면 대화를 모두 지우고 처음 상태로 돌아갑니다.
//
// 답변 칸 순서: 지금 상황을 보면 → (자료 부족 안내) → 알아두면 좋은 권리 → 지금 해볼 수 있는 것
//              → 도움이 필요하다면 → 확인하면 더 정확한 부분 → 참고해 주세요 → 확인한 정보

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PENDING_QUESTION_KEY } from './AskBox';
import { EmergencyCard } from './EmergencyCard';
import { Icon } from './Icon';
import { OrgCard } from './OrgCard';
import { formatDate, getMessages, type Locale, type Messages } from '@/lib/i18n';
import type { AskApiRequest, AskApiResponse, AskHistoryTurn } from '@/lib/types';

const MAX_LENGTH = 500;
/** 추가 질문 때 함께 보내는 최근 대화 수 (서버에서도 같은 수로 한 번 더 제한합니다) */
const MAX_HISTORY_TURNS = 3;

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

/** 답변 안의 칸 제목. 권리와 할 일은 더 크게 보여줍니다. */
function SectionTitle({ icon, children, strong = false }: { icon?: 'shield' | 'check'; children: string; strong?: boolean }) {
  if (!strong) return <h3 className="text-base font-bold text-ink-900">{children}</h3>;
  return (
    <h3 className="flex items-center gap-2.5 text-lg font-extrabold text-ink-900 sm:text-xl">
      {icon && (
        <span className="lr-icon-badge h-9 w-9">
          <Icon name={icon} size={18} />
        </span>
      )}{' '}
      {children}
    </h3>
  );
}

/** 서버가 돌려준 결과 하나(오류 · 긴급 안내 · AI 답변)를 그립니다. */
function ResultView({
  result,
  locale,
  t,
  onNewQuestion,
}: {
  result: AskApiResponse;
  locale: Locale;
  t: Messages;
  onNewQuestion: () => void;
}) {
  const errorMessage = errorMessageOf(result, t);

  return (
    <>
      {errorMessage && (
        <div className="lr-card lr-appear border-[var(--color-warm-500)] bg-warm-100 p-5 sm:p-6">
          <p className="text-base font-semibold text-ink-900">{errorMessage}</p>
          {!result.ok && result.fallback && result.fallback.length > 0 && (
            <>
              <p className="mt-4 text-sm font-bold text-ink-900">{t.ask.fallbackTitle}</p>
              <ul className="mt-2 space-y-1.5">
                {result.fallback.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="lr-link text-[15px]">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
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

      {result.ok && result.mode === 'ai' && result.answer && (
        <article className="lr-card lr-appear overflow-hidden">
          {/* 지금 상황을 보면 */}
          <div className="border-b border-[var(--color-line)] bg-surface-soft px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-700">
              <Icon name="sparkles" size={16} /> {t.ask.resultSituation}
            </h2>{' '}
            <p className="mt-2 text-[17px] leading-relaxed text-ink-900">{result.answer.summary}</p>
          </div>

          <div className="space-y-9 px-5 py-6 sm:px-7 sm:py-8">
            {/* 자료 부족 안내: 등록된 권리정보 중 이 상황에 맞는 자료가 없을 때 */}
            {result.evidence === 'none' && (
              <section className="lr-callout border-l-[var(--color-ink-300)] bg-surface-soft">
                <h3 className="text-[15px] font-bold text-ink-900">{t.ask.evidenceNoneTitle}</h3>{' '}
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{t.ask.evidenceNoneBody}</p>
              </section>
            )}

            {/* 알아두면 좋은 권리 (근거 자료가 있을 때만) */}
            {result.answer.rights.length > 0 && (
              <section>
                <SectionTitle icon="shield" strong>
                  {t.ask.resultRights}
                </SectionTitle>
                <ul className="mt-4 space-y-3">
                  {result.answer.rights.map((item, index) => (
                    <li key={index} className="lr-callout">
                      <p className="text-base font-bold text-ink-900">{item.title}</p>{' '}
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 지금 해볼 수 있는 것 */}
            {result.answer.actions.length > 0 && (
              <section>
                <SectionTitle icon="check" strong>
                  {t.ask.resultActions}
                </SectionTitle>
                <ol className="mt-4 space-y-4">
                  {result.answer.actions.map((item, index) => (
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

            {/* 도움이 필요하다면 (근거 자료와 연결된 기관이 있을 때만) */}
            {result.organizations.length > 0 && (
              <section>
                <SectionTitle>{t.ask.resultOrgs}</SectionTitle>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {result.organizations.map((org) => (
                    <OrgCard key={org.id} org={org} locale={locale} compact />
                  ))}
                </div>
              </section>
            )}

            {/* 확인하면 더 정확한 부분 */}
            {result.answer.follow_up_question && (
              <section className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-4">
                <h3 className="text-[15px] font-bold text-ink-900">{t.ask.resultFollowUp}</h3>{' '}
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{result.answer.follow_up_question}</p>
              </section>
            )}

            {/* 참고해 주세요 */}
            {result.answer.limitations && (
              <section className="rounded-[var(--radius-control)] border border-[var(--color-warm-500)] bg-warm-100 p-4">
                <h3 className="text-[15px] font-bold text-ink-900">{t.ask.resultLimitations}</h3>{' '}
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{result.answer.limitations}</p>
              </section>
            )}

            {/* 확인한 정보: 실제로 사용한 등록 자료의 제목, 검토일, 발행기관과 공식 링크 */}
            {result.sources.length > 0 && (
              <section className="border-t border-[var(--color-line)] pt-6">
                <SectionTitle>{t.ask.resultSources}</SectionTitle>
                <ul className="mt-3 space-y-3">
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
              </section>
            )}

            <p className="border-t border-[var(--color-line)] pt-5 text-[13px] leading-relaxed text-ink-500">
              {t.ask.disclaimer}
            </p>
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
}: {
  locale: Locale;
  examples: string[];
  initialQuestion: string;
  fallbackLinks: FallbackLink[];
}) {
  const t = getMessages(locale);
  const [question, setQuestion] = useState(initialQuestion);
  const [followUp, setFollowUp] = useState('');
  /** 지금 보내는 중인 질문의 종류. 'new' = 처음 질문, 'followUp' = 추가 질문 */
  const [pending, setPending] = useState<'new' | 'followUp' | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(false);
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

    setTurns([...previousTurns, { question: trimmed, result }]);
    // 추가 질문이 잘 전달됐으면 입력창을 비웁니다. 실패했으면 다시 보낼 수 있도록 남겨 둡니다.
    if (isFollowUp && result.ok) setFollowUp('');
    setPending(null);
  }

  /** 대화를 모두 지우고 처음 질문 상태로 돌아갑니다. */
  function startNewQuestion() {
    setTurns([]);
    setQuestion('');
    setFollowUp('');
    questionRef.current?.focus();
  }

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  // 새 결과가 오면 그 결과가 시작되는 곳으로 화면을 옮기고, 초점도 옮겨 화면낭독기가 읽게 합니다.
  useEffect(() => {
    if (turns.length > 0 && latestTurnRef.current) {
      latestTurnRef.current.focus({ preventScroll: true });
      latestTurnRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [turns]);

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
          void ask(question);
        }}
        className="lr-card p-5 sm:p-7"
      >
        <label htmlFor="question" className="block">
          <span className="block text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
            {t.ask.questionHeading}
          </span>{' '}
          <span className="mt-1.5 block text-[15px] leading-relaxed text-ink-500">{t.ask.questionHint}</span>
        </label>
        <textarea
          ref={questionRef}
          id="question"
          value={question}
          maxLength={MAX_LENGTH}
          rows={5}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t.ask.placeholder}
          className="lr-input mt-4 resize-y"
        />
        {/* 개인정보 입력 금지 안내 */}
        <p className="mt-2.5 flex items-start gap-2 text-sm leading-relaxed text-ink-500">
          <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-brand-600" /> <span>{t.ask.privacyShort}</span>
        </p>
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
            <ResultView result={turn.result} locale={locale} t={t} onNewQuestion={startNewQuestion} />
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
              void ask(followUp, true);
            }}
            className="lr-card p-5 sm:p-6"
          >
            <label htmlFor="follow-up-question" className="block text-base font-bold text-ink-900">
              {t.ask.followUpTitle}
            </label>
            <textarea
              id="follow-up-question"
              value={followUp}
              maxLength={MAX_LENGTH}
              rows={3}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder={t.ask.followUpPlaceholder}
              className="lr-input mt-3 resize-y"
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
          </form>
        )}
      </div>
    </div>
  );
}
