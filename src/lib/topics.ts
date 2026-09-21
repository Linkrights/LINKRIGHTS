// 도움받을 곳의 "분야"(주제) 목록입니다.
// 기관 데이터(content/organizations.json)의 topics 에는 여기 있는 값만 적습니다.
// 화면에 보이는 이름은 messages 의 orgTopics 에 4개 언어로 있습니다.
//
// category(긴급·청소년기관·이주민 지원·공공기관·법률 상담)는 "어떤 곳인지",
// topics 는 "무엇을 도와주는지"입니다. 둘은 따로 씁니다.

export const ORG_TOPICS = ['labor', 'legal', 'visa', 'health', 'mental', 'education', 'family', 'safety', 'rights'] as const;

export type OrgTopic = (typeof ORG_TOPICS)[number];

export function isOrgTopic(value: string): value is OrgTopic {
  return (ORG_TOPICS as readonly string[]).includes(value);
}
