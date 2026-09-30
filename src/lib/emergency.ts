// 긴급상황을 감지하는 곳입니다.
// AI가 위험 여부를 "판단"하지 않도록, 검토된 키워드 목록으로 먼저 확인합니다.
// 키워드가 걸리면 AI를 호출하지 않고 곧바로 긴급 안내를 보여줍니다(비용 0원, 응답 즉시).

import { getEmergencyConfig } from './content';
import { pick, type Locale } from './i18n';

export function detectEmergency(question: string): boolean {
  const config = getEmergencyConfig();
  const text = question.toLowerCase();
  for (const list of Object.values(config.keywords)) {
    for (const keyword of list) {
      const term = keyword.toLowerCase().trim();
      if (term.length >= 2 && text.includes(term)) return true;
    }
  }
  return false;
}

/**
 * 긴급 안내 카드입니다. 두 가지가 있습니다.
 *   danger   폭력·위험 낱말이 걸렸을 때 (112·119 중심, 증거 남기기까지 안내)
 *   feelings 마음이 힘들다고 했을 때 (AI가 긴급으로 판단했지만 위험 낱말은 없는 경우)
 * 두 안내 모두 content/emergency.json 에 적어 둔 문장만 씁니다.
 */
export function buildEmergencyCard(locale: Locale, kind: 'danger' | 'feelings' = 'danger') {
  const config = getEmergencyConfig();
  const variant = kind === 'feelings' && config.feelings ? config.feelings : config;
  return {
    title: pick(variant.title, locale),
    message: pick(variant.message, locale),
    steps: variant.steps[locale] ?? variant.steps.ko,
    note: pick(variant.note ?? config.note, locale),
    organizationIds: variant.organizations ?? config.organizations,
  };
}
