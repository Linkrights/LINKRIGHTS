// 글 보내기 칸을 화면에 놓는 부품입니다. (서버에서 그립니다)
//
// 데이터베이스가 연결되어 있으면 바로 쓸 수 있는 입력칸을, 연결되어 있지 않으면 예전처럼 메일 주소를 보여줍니다.
// 화면 문구는 messages 의 forms 묶음에서 오고, 필요한 문구만 골라 브라우저로 넘깁니다.

import { SubmitForm, type SubmitFormLabels } from './SubmitForm';
import { getSite } from '@/lib/content';
import { hasDb } from '@/lib/db';
import { getMessages, type Locale } from '@/lib/i18n';

export function canSubmit(): boolean {
  return hasDb();
}

export function SubmitBox({
  locale,
  kind,
  detail = '',
  needContact = false,
  withTitle = true,
  rows = 6,
}: {
  locale: Locale;
  kind: 'question' | 'join' | 'correction';
  detail?: string;
  needContact?: boolean;
  withTitle?: boolean;
  rows?: number;
}) {
  const t = getMessages(locale);
  const email = getSite().contactEmail;

  if (!hasDb()) {
    return (
      <p className="text-[15px] leading-relaxed text-ink-700">
        {t.forms.disabled.split('{email}')[0]}
        <a className="lr-link break-all" href={`mailto:${email}`}>
          {email}
        </a>
        {t.forms.disabled.split('{email}')[1]}
      </p>
    );
  }

  // 누가 보내는 칸인지에 따라 묻는 말이 달라집니다.
  // (멘토·학교/기관 문의에는 청소년에게 하는 말투나 보호자 안내를 쓰지 않습니다)
  const forAdults = detail === 'mentor' || detail === 'partner';
  const bodyPlaceholder =
    detail === 'mentor'
      ? t.forms.bodyPlaceholderMentor
      : detail === 'partner'
        ? t.forms.bodyPlaceholderPartner
        : t.forms.bodyPlaceholder;

  const labels: SubmitFormLabels = {
    titleLabel: t.forms.titleLabel,
    titlePlaceholder: t.forms.titlePlaceholder,
    bodyLabel: t.forms.bodyLabel,
    bodyPlaceholder,
    contactLabel: t.forms.contactLabel,
    contactPlaceholder: t.forms.contactPlaceholder,
    contactOptional: t.forms.contactOptional,
    contactRequired: t.forms.contactRequired,
    guardianNote: forAdults ? '' : t.forms.guardianNote,
    storeNote: t.forms.storeNote,
    privacyLink: t.forms.privacyLink,
    submit: t.forms.submit,
    sending: t.forms.sending,
    successTitle: t.forms.successTitle,
    successBody: t.forms.successBody,
    another: t.forms.another,
    errorBody: t.forms.errorBody,
    errorRate: t.forms.errorRate,
    errorShort: t.forms.errorShort,
    errorContact: t.forms.errorContact,
    privacyTitle: t.forms.privacyTitle,
    privacyBody: t.forms.privacyBody,
    privacyRemove: t.forms.privacyRemove,
  };

  return (
    <div>
      <SubmitForm
        kind={kind}
        detail={detail}
        locale={locale}
        labels={labels}
        needContact={needContact}
        withTitle={withTitle}
        rows={rows}
      />
      <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
        {t.forms.mailInstead.split('{email}')[0]}
        <a className="lr-link break-all" href={`mailto:${email}`}>
          {email}
        </a>
        {t.forms.mailInstead.split('{email}')[1]}
      </p>
    </div>
  );
}
