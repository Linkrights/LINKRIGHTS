// 소리 내어 읽어주기(ReadAloud)에서 쓸 "읽는 글"을 만듭니다.
//
// 왜 필요한가요?
//   한국어 음성이 1331 같은 번호를 "일삼삼일"처럼 한 자리씩 읽어 잘 들리지 않는다는 의견이 있었습니다.
//   그래서 읽어줄 때만 1331 → "천삼백삼십일" 처럼 수를 읽는 방식으로 바꿉니다.
//
// 무엇을 지키나요?
//   - 화면에 보이는 번호와 전화 버튼(tel:)의 번호는 그대로입니다. 이 함수는 소리로 읽을 글자만 바꿉니다.
//   - 등록된 번호를 고치거나 새로 만들지 않습니다. 숫자를 한글로 적어줄 뿐입니다.
//   - 한국어 화면에서만 바꿉니다. 다른 언어 음성은 숫자를 이미 수로 읽습니다.
//   - 0으로 시작하는 지역번호(02, 031)나 010 번호, 네 자리를 넘는 숫자는 건드리지 않습니다.
//     (031-123-4567 같은 번호는 한 자리씩 읽는 것이 오히려 알아듣기 쉽습니다)

import type { Locale } from './types';

const SINO = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const UNITS = ['', '십', '백', '천'];

/** 1~9999 를 한글 수로 적습니다. (1331 → 천삼백삼십일) */
export function sinoKoreanNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 9999) return String(value);
  if (value === 0) return SINO[0];
  const digits = String(value).split('').map(Number);
  let out = '';
  digits.forEach((digit, index) => {
    const unit = UNITS[digits.length - 1 - index];
    if (digit === 0) return;
    // 십·백·천 자리의 1 은 "일"을 붙이지 않습니다. (110 → 백십)
    out += (digit === 1 && unit ? '' : SINO[digit]) + unit;
  });
  return out;
}

/** 소리로 읽을 글을 만듭니다. (한국어 화면에서 세 자리·네 자리 번호만 한글 수로 바꿉니다) */
export function speakableText(text: string, locale: Locale): string {
  if (locale !== 'ko') return text;
  return text.replace(/\d+/g, (digits, index: number, whole: string) => {
    if (digits.length < 3 || digits.length > 4) return digits;
    if (digits.startsWith('0')) return digits;
    // 앞뒤가 숫자·하이픈으로 이어지는 긴 번호(031-123-4567)는 그대로 둡니다.
    const before = whole[index - 1] ?? '';
    const after = whole[index + digits.length] ?? '';
    if (/[\d-]/.test(before) || /[\d-]/.test(after)) return digits;
    return sinoKoreanNumber(Number(digits));
  });
}
