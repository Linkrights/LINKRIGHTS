'use client';

// AI 질문 화면입니다. 질문을 /api/ask 로 보내고, 돌아온 결과를 카드로 그립니다.
// OpenAI 키는 서버에만 있으므로 이 파일에는 키가 전혀 들어 있지 않습니다.
//
// 추가 질문: AI 답변 아래의 "추가 질문하기"로 이어서 물어보면
// 최근 대화(질문 + 답변)를 함께 보내 앞의 내용에 이어서 답하게 합니다.
// "새 질문"을 누르면 대화를 모두 지우고 처음 상태로 돌아갑니다.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
      history.push({ question, answer: { summary, rights, actions, follow_up_question, limitations } });
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

/** 서버가 돌려준 결과 하나(오류 · 긴급 안내 · AI 답변)를 그립니다. 기존 화면과 같은 모양입니다. */
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
        <div className="lr-card border-[var(--color-warm-500)] bg-warm-100 p-5">
          <p className="text-[15px] font-semibold text-ink-900">{errorMessage}</p>
          {!result.ok && result.fallback && result.fallback.length > 0 && (
            <>
              <p className="mt-4 text-sm font-bold text-ink-900">{t.ask.fallbackTitle}</p>
              <ul className="mt-2 space-y-1.5">
                {result.fallback.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="lr-link text-sm">
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
        <article className="lr-card overflow-hidden">
          <div className="border-b border-[var(--color-line)] bg-brand-50 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-800">
              <Icon name="sparkles" size={16} />
              {t.ask.resultSituation}
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-900">{result.answer.summary}</p>
          </div>

          <div className="space-y-6 p-5">
            {result.answer.rights.length > 0 && (
              <section>
                <h3 className="text-base font-extrabold text-ink-900">{t.ask.resultRights}</h3>
                <ul className="mt-3 space-y-3">
                  {result.answer.rights.map((item, index) => (
                    <li key={index} className="rounded-xl bg-surface-soft p-4">
                      <p className="font-bold text-ink-900">{item.title}</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.answer.actions.length > 0 && (
              <section>
                <h3 className="text-base font-extrabold text-ink-900">{t.ask.resultActions}</h3>
                <ol className="mt-3 space-y-3">
                  {result.answer.actions.map((item, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block font-bold text-ink-900">{item.title}</span>
                        <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-700">{item.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {result.organizations.length > 0 && (
              <section>
                <h3 className="text-base font-extrabold text-ink-900">{t.ask.resultOrgs}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {result.organizations.map((org) => (
                    <OrgCard key={org.id} org={org} locale={locale} compact />
                  ))}
                </div>
              </section>
            )}

            {result.sources.length > 0 && (
              <section>
                <h3 className="text-base font-extrabold text-ink-900">{t.ask.resultSources}</h3>
                <ul className="mt-3 space-y-2">
                  {result.sources.map((source) => (
                    <li key={source.id} className="rounded-xl border border-[var(--color-line)] p-3">
                      <Link href={source.href} className="lr-link text-sm font-semibold">
                        {source.title}
                      </Link>
                      <p className="mt-1 text-xs text-ink-300">
                        {t.common.reviewedAt} {formatDate(source.reviewed_at, locale)}
                      </p>
                      {source.sources.length > 0 && (
                        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                          {source.sources.map((official) => (
                            <li key={official.url}>
                              <a
                                href={official.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-ink-500 underline underline-offset-2 hover:text-brand-700"
                              >
                                <Icon name="external" size={12} />
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

            {result.answer.limitations && (
              <section className="rounded-xl border border-[var(--color-warm-500)] bg-warm-100 p-4">
                <h3 className="text-sm font-bold text-ink-900">{t.ask.resultLimitations}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{result.answer.limitations}</p>
              </section>
            )}

            {result.answer.follow_up_question && (
              <section>
                <h3 className="text-sm font-bold text-ink-900">{t.ask.resultFollowUp}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{result.answer.follow_up_question}</p>
              </section>
            )}

            <p className="border-t border-[var(--color-line)] pt-4 text-xs leading-relaxed text-ink-500">
              {t.ask.disclaimer}
            </p>
          </div>
        </article>
      )}

      {result.ok && result.mode === 'emergency' && (
        <div className="lr-card p-5">
          <p className="text-sm leading-relaxed text-ink-700">{t.ask.disclaimer}</p>
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
    // 최초 질문은 기존과 똑같이 질문과 언어만 보냅니다.
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

  // 홈에서 질문을 적고 넘어온 경우 자동으로 한 번 물어봅니다.
  useEffect(() => {
    if (initialQuestion && !askedRef.current) {
      askedRef.current = true;
      void ask(initialQuestion);
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 개인정보 입력 금지 안내 */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
          <Icon name="shield" size={16} />
          {t.ask.privacyTitle}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">{t.ask.privacyBody}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="mt-5"
      >
        <label htmlFor="question" className="block text-sm font-bold text-ink-900">
          {t.ask.title}
        </label>
        <textarea
          ref={questionRef}
          id="question"
          value={question}
          maxLength={MAX_LENGTH}
          rows={4}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t.ask.placeholder}
          className="mt-2 w-full resize-y rounded-xl border border-[var(--color-line)] bg-white p-4 text-base leading-relaxed text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-400"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-300">
            {MAX_LENGTH - question.length} {t.ask.charsLeft}
          </span>
          <button type="submit" disabled={loading || !question.trim()} className="lr-btn lr-btn-primary">
            {pending === 'new' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t.ask.sending}
              </>
            ) : (
              <>
                <Icon name="sparkles" size={18} />
                {t.ask.submit}
              </>
            )}
          </button>
        </div>
      </form>

      {turns.length === 0 && !loading && examples.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-500">{t.home.exampleLabel}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {examples.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setQuestion(example);
                    void ask(example);
                  }}
                  className="rounded-full border border-[var(--color-line)] bg-white px-3.5 py-2 text-left text-sm text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div aria-live="polite" className="mt-8 space-y-5 outline-none">
        {turns.map((turn, index) => (
          <div
            key={index}
            ref={index === turns.length - 1 ? latestTurnRef : undefined}
            tabIndex={-1}
            className="space-y-5 outline-none"
          >
            {/* 추가 질문은 무엇을 물었는지 답변 위에 함께 보여줍니다. (처음 질문은 위 입력창에 있습니다) */}
            {index > 0 && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-sm font-bold text-brand-800">{t.ask.myQuestion}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-900">{turn.question}</p>
              </div>
            )}
            <ResultView result={turn.result} locale={locale} t={t} onNewQuestion={startNewQuestion} />
          </div>
        ))}

        {loading && (
          <div className="lr-card p-6 text-center text-sm text-ink-500">
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
            className="lr-card p-5"
          >
            <label htmlFor="follow-up-question" className="block text-sm font-bold text-ink-900">
              {t.ask.followUpTitle}
            </label>
            <textarea
              id="follow-up-question"
              value={followUp}
              maxLength={MAX_LENGTH}
              rows={3}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder={t.ask.followUpPlaceholder}
              className="mt-2 w-full resize-y rounded-xl border border-[var(--color-line)] bg-white p-4 text-base leading-relaxed text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-400"
            />
            {/* 휴대폰에서는 글자 수 아래에 버튼 두 개가 나란히, 넓은 화면에서는 한 줄로 보입니다.
                화면이 아주 좁으면 버튼 글자가 꺾이지 않고 버튼이 다음 줄로 내려갑니다. */}
            <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <span className="text-xs text-ink-300">
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
                      <Icon name="sparkles" size={18} />
                      {t.ask.submit}
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
