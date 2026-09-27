'use client';

// 사이트에서 바로 글을 보내는 칸입니다. (질문 게시판 질문 · 참여 문의 · 정보 수정 제보)
//
// 메일 앱을 쓰지 않아도 보낼 수 있게 하려고 만들었습니다. 보낸 글은 운영팀 관리자 페이지에서만 보이고,
// 운영팀이 검토해 올리기 전까지 사이트 어디에도 나타나지 않습니다.
//
// 지키는 것
//  - 이름 칸은 없습니다. "답장 받을 곳"은 질문에서는 비워 둘 수 있습니다.
//  - 보내기 전에 전화번호·등록번호처럼 보이는 글자가 있으면 먼저 알려주고 지울 수 있게 합니다. (privacy-detect)
//  - 보이지 않는 칸(website)은 자동 프로그램을 거르기 위한 것입니다. 사람은 채우지 않습니다.

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { findPersonalInfo, removePersonalInfo } from './privacy-detect';
import { LIMITS } from '@/lib/submissions';

export interface SubmitFormLabels {
  titleLabel: string;
  titlePlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  contactOptional: string;
  contactRequired: string;
  guardianNote: string;
  storeNote: string;
  privacyLink: string;
  submit: string;
  sending: string;
  successTitle: string;
  successBody: string;
  another: string;
  errorBody: string;
  errorRate: string;
  errorShort: string;
  errorContact: string;
  privacyTitle: string;
  privacyBody: string;
  privacyRemove: string;
}

export function SubmitForm({
  kind,
  detail = '',
  locale,
  labels,
  needContact = false,
  withTitle = true,
  rows = 6,
}: {
  kind: 'question' | 'join' | 'correction';
  detail?: string;
  locale: string;
  labels: SubmitFormLabels;
  /** 답장을 드려야 하는 글(참여 문의)에서는 연락처를 받습니다. */
  needContact?: boolean;
  withTitle?: boolean;
  rows?: number;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const website = useRef<HTMLInputElement>(null);
  // 한 화면에 칸이 여러 개 있어도(함께하기의 세 가지 문의) 이름표가 겹치지 않게 합니다.
  const fieldId = useId();

  const matches = findPersonalInfo(body);

  async function send(text: string) {
    setState('sending');
    setError('');
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          detail,
          locale,
          title,
          body: text,
          contact,
          website: website.current?.value ?? '',
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; id?: number; error?: string };
      if (!response.ok || !data.ok) {
        setState('idle');
        if (data.error === 'rate_limit') setError(labels.errorRate);
        else if (data.error === 'body') setError(labels.errorShort);
        else if (data.error === 'contact') setError(labels.errorContact);
        else setError(labels.errorBody);
        return;
      }
      setTicket(data.id ?? 0);
      setState('done');
      setTitle('');
      setBody('');
      setContact('');
    } catch {
      setState('idle');
      setError(labels.errorBody);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    void send(body);
  }

  if (state === 'done') {
    return (
      <div className="rounded-[var(--radius-control)] border border-brand-200 bg-brand-50 p-5" aria-live="polite">
        <p className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
          <Icon name="check" size={18} className="text-brand-600" /> {labels.successTitle}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">
          {labels.successBody.replace('{id}', ticket > 0 ? `#${ticket}` : '')}
        </p>
        <button
          type="button"
          onClick={() => {
            setState('idle');
            setTicket(0);
          }}
          className="lr-btn lr-btn-ghost lr-btn-sm lr-press mt-4"
        >
          {labels.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {withTitle && (
        <div>
          <label htmlFor={`submit-title-${fieldId}`} className="block text-[15px] font-semibold text-ink-900">
            {labels.titleLabel}
          </label>
          <input
            id={`submit-title-${fieldId}`}
            value={title}
            maxLength={LIMITS.title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={labels.titlePlaceholder}
            className="lr-input mt-1.5"
          />
        </div>
      )}

      <div>
        <label htmlFor={`submit-body-${fieldId}`} className="block text-[15px] font-semibold text-ink-900">
          {labels.bodyLabel}
        </label>
        <textarea
          id={`submit-body-${fieldId}`}
          ref={bodyRef}
          value={body}
          rows={rows}
          maxLength={LIMITS.body}
          required
          onChange={(event) => setBody(event.target.value)}
          placeholder={labels.bodyPlaceholder}
          className="lr-input mt-1.5 resize-y"
        />
      </div>

      {/* 개인정보로 보이는 글자가 있으면 보내기 전에 먼저 알려줍니다. */}
      <div aria-live="polite">
        {matches.length > 0 && (
          <div className="rounded-[var(--radius-control)] border border-[var(--color-warm-500)] bg-warm-100 p-4">
            <p className="flex items-start gap-2 text-[15px] font-bold text-ink-900">
              <Icon name="shield" size={18} className="mt-0.5 shrink-0" /> <span>{labels.privacyTitle}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-700">{labels.privacyBody}</p>
            <button
              type="button"
              onClick={() => {
                setBody(removePersonalInfo(body, matches));
                bodyRef.current?.focus();
              }}
              className="lr-btn lr-btn-ghost lr-btn-sm mt-3"
            >
              {labels.privacyRemove}
            </button>
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`submit-contact-${fieldId}`} className="block text-[15px] font-semibold text-ink-900">
          {labels.contactLabel}{' '}
          <span className="font-normal text-ink-500">{needContact ? labels.contactRequired : labels.contactOptional}</span>
        </label>
        <input
          id={`submit-contact-${fieldId}`}
          value={contact}
          maxLength={LIMITS.contact}
          required={needContact}
          onChange={(event) => setContact(event.target.value)}
          placeholder={labels.contactPlaceholder}
          className="lr-input mt-1.5"
        />
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{labels.guardianNote}</p>
      </div>

      {/* 보이지 않는 칸: 자동 프로그램이 채우면 저장하지 않습니다. (화면낭독기에서도 읽지 않습니다) */}
      <input
        ref={website}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={state === 'sending'} className="lr-btn lr-btn-primary lr-press">
          {state === 'sending' ? labels.sending : labels.submit} <Icon name="arrow-right" size={18} />
        </button>
        <p className="text-[13px] leading-relaxed text-ink-500">
          {labels.storeNote}{' '}
          <Link href={`/${locale}/privacy`} className="lr-link">
            {labels.privacyLink}
          </Link>
        </p>
      </div>

      <p aria-live="polite" className="text-[15px] font-semibold text-[var(--color-danger-700)]">
        {error}
      </p>
    </form>
  );
}
