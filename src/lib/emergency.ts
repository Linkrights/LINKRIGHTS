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

export function buildEmergencyCard(locale: Locale) {
  const config = getEmergencyConfig();
  return {
    title: pick(config.title, locale),
    message: pick(config.message, locale),
    steps: config.steps[locale] ?? config.steps.ko,
    note: pick(config.note, locale),
    organizationIds: config.organizations,
  };
}
