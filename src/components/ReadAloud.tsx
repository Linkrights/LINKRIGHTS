'use client';

// 권리정보를 소리 내어 읽어주는 버튼입니다. 브라우저에 들어 있는 음성 기능(Web Speech API)을 쓰며, 서버·비용이 들지 않습니다.
// - 누르면 지금 보고 있는 언어의 글을 문장 단위로 나눠 차례로 읽습니다.
//   (긴 글을 한 번에 읽으면 일부 브라우저에서 중간에 멈추는 문제를 피합니다)
// - 읽는 중에 누르면 멈추고, 다시 누르면 멈춘 문장부터 이어서 읽습니다. [그만 읽기]로 끝냅니다.
// - 브라우저가 음성 기능을 지원하지 않으면 버튼 대신 안내 문구를 보여줍니다.
// - 이 기기에 해당 언어 음성이 없으면 그렇다고 알려줍니다.
// - 크롬 등 일부 브라우저의 음성은 읽을 글(공개된 권리정보)을 음성 서비스로 보내 소리로 바꿀 수 있습니다. 개인정보는 보내지 않습니다.

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { speakableText } from '@/lib/speech';
import type { Locale } from '@/lib/types';

export interface ReadAloudLabels {
  listen: string;
  pause: string;
  resume: string;
  stop: string;
  reading: string;
  paused: string;
  unsupported: string;
  noVoice: string;
}

const SPEECH_LANG: Record<Locale, string> = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', vi: 'vi-VN' };
const MAX_CHUNK = 180;

/**
 * 글을 문장 단위(너무 길면 쉼표·띄어쓰기 기준)로 나눕니다.
 * 한국어는 1331 같은 번호를 "천삼백삼십일"처럼 읽도록 소리용 글자로 바꿉니다. (화면 글자는 그대로)
 */
function splitText(blocks: string[], locale: Locale): string[] {
  const chunks: string[] = [];
  for (const block of blocks) {
    const text = speakableText(block, locale).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    for (const sentence of text.split(/(?<=[.!?。！？])\s*/)) {
      let rest = sentence.trim();
      while (rest.length > MAX_CHUNK) {
        const cut = Math.max(rest.lastIndexOf(', ', MAX_CHUNK), rest.lastIndexOf('，', MAX_CHUNK), rest.lastIndexOf(' ', MAX_CHUNK));
        const at = cut > 40 ? cut + 1 : MAX_CHUNK;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      if (rest) chunks.push(rest);
    }
  }
  return chunks;
}

export function ReadAloud({ blocks, locale, labels }: { blocks: string[]; locale: Locale; labels: ReadAloudLabels }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [noVoice, setNoVoice] = useState(false);
  const chunks = useRef<string[]>([]);
  const position = useRef(0);
  // 멈추거나 새로 읽기 시작하면 값이 바뀌어, 이전 읽기의 "다음 문장" 예약이 실행되지 않게 합니다.
  const run = useRef(0);

  useEffect(() => {
    const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setSupported(ok);
    if (!ok) return;
    return () => {
      run.current += 1;
      window.speechSynthesis.cancel();
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | undefined {
    const prefix = locale;
    const voices = window.speechSynthesis.getVoices();
    const matches = voices.filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(prefix));
    setNoVoice(voices.length > 0 && matches.length === 0);
    return matches.find((voice) => voice.localService) ?? matches[0];
  }

  function speakFrom(start: number) {
    const synth = window.speechSynthesis;
    run.current += 1;
    const current = run.current;
    synth.cancel();
    const voice = pickVoice();
    const speak = (index: number) => {
      if (current !== run.current) return;
      if (index >= chunks.current.length) {
        position.current = 0;
        setState('idle');
        return;
      }
      position.current = index;
      const utterance = new SpeechSynthesisUtterance(chunks.current[index]);
      utterance.lang = SPEECH_LANG[locale];
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => speak(index + 1);
      utterance.onerror = (event) => {
        if (current !== run.current || event.error === 'interrupted' || event.error === 'canceled') return;
        setState('idle');
      };
      synth.speak(utterance);
    };
    setState('playing');
    speak(start);
  }

  function toggle() {
    if (state === 'playing') {
      run.current += 1;
      window.speechSynthesis.cancel();
      setState('paused');
    } else if (state === 'paused') {
      speakFrom(position.current);
    } else {
      chunks.current = splitText(blocks, locale);
      speakFrom(0);
    }
  }

  function stop() {
    run.current += 1;
    window.speechSynthesis.cancel();
    position.current = 0;
    setState('idle');
  }

  if (supported === false) {
    return <p className="text-sm leading-relaxed text-ink-500">{labels.unsupported}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={toggle} disabled={supported === null} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
        <Icon name={state === 'playing' ? 'pause' : 'speaker'} size={18} />
        {state === 'playing' ? labels.pause : state === 'paused' ? labels.resume : labels.listen}
      </button>
      {state !== 'idle' && (
        <button type="button" onClick={stop} className="lr-btn lr-btn-ghost lr-btn-sm">
          <Icon name="stop" size={16} />
          {labels.stop}
        </button>
      )}
      <span aria-live="polite" className="text-sm text-ink-500">
        {state === 'playing' ? labels.reading : state === 'paused' ? labels.paused : ''}
      </span>
      {noVoice && <p className="w-full text-sm leading-relaxed text-ink-500">{labels.noVoice}</p>}
    </div>
  );
}
