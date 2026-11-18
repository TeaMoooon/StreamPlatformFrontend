import { REPORT_REASON_TITLE, ReportReason, ReportTargetType } from '../../api/reportsApi';

export type ReportSuboption = {
  id: string;
  title: string;
  description: string;
};

export type ReportCategory = {
  reason: ReportReason;
  title: string;
  description: string;
  /** Highlight in the list — staff should see these sooner */
  urgent?: boolean;
  suboptions?: ReportSuboption[];
};

const baseCategories = (descriptions: Partial<Record<ReportReason, string>>): ReportCategory[] => [
  {
    reason: 'child_safety',
    title: REPORT_REASON_TITLE.child_safety,
    description: descriptions.child_safety || 'Контент с участием несовершеннолетних, эксплуатация, жестокое обращение',
    urgent: true,
  },
  {
    reason: 'terrorism',
    title: REPORT_REASON_TITLE.terrorism,
    description: descriptions.terrorism || 'Пропаганда терроризма, вербовка, инструкции по терактам',
    urgent: true,
  },
  {
    reason: 'violence',
    title: REPORT_REASON_TITLE.violence,
    description: descriptions.violence || 'Реалистичное насилие, кровь, чрезмерная жестокость',
    urgent: true,
  },
  {
    reason: 'sexual',
    title: REPORT_REASON_TITLE.sexual,
    description: descriptions.sexual || 'Нагота, порнография, откровенно сексуальный контент',
    urgent: true,
  },
  {
    reason: 'self_harm',
    title: REPORT_REASON_TITLE.self_harm,
    description: descriptions.self_harm || 'Суицид, нанесение себе увечий, опасные челленджи',
    urgent: true,
  },
  {
    reason: 'harassment',
    title: REPORT_REASON_TITLE.harassment,
    description: descriptions.harassment || 'Травля, домогательства, целенаправленные нападки',
  },
  {
    reason: 'hate',
    title: REPORT_REASON_TITLE.hate,
    description: descriptions.hate || 'Ненависть или дискриминация по защищённым признакам',
  },
  {
    reason: 'spam',
    title: REPORT_REASON_TITLE.spam,
    description: descriptions.spam || 'Спам, фишинг, боты, вмешательство в работу сервиса',
  },
  {
    reason: 'other',
    title: REPORT_REASON_TITLE.other,
    description: descriptions.other || 'Нарушение правил, которое не подходит под пункты выше',
  },
];

/** Жалоба на профиль / канал. */
export const PROFILE_REPORT_CATEGORIES: ReportCategory[] = baseCategories({
  child_safety: 'В профиле или на канале — контент с эксплуатацией несовершеннолетних',
  terrorism: 'Пропаганда терроризма в описании, ссылках или материалах канала',
  violence: 'Жестокие или отталкивающие материалы в профиле',
  sexual: 'Сексуальный контент в аватаре, баннере, описании или ссылках',
  self_harm: 'Призывы к самоповреждению в материалах канала',
  harassment: 'Травля через профиль, самозванство, преследование',
  hate: 'Ненависть в описании, никах или ссылках канала',
  spam: 'Фишинг, мошеннические ссылки или навязчивая реклама в профиле',
  other: 'Другое нарушение правил профиля',
});

/** Жалоба на текущий эфир. */
export const STREAM_REPORT_CATEGORIES: ReportCategory[] = [
  ...baseCategories({
    child_safety: 'В эфире — контент с участием или эксплуатацией несовершеннолетних',
    terrorism: 'Пропаганда терроризма или опасные инструкции в трансляции',
    violence: 'Насилие или чрезмерная жестокость в эфире',
    sexual: 'Нагота или откровенно сексуальный контент в трансляции',
    self_harm: 'Самоповреждение, опасные действия или челленджи в эфире',
    harassment: 'Стример травит людей, устраивает рейды или травлю',
    hate: 'Разжигание ненависти со стороны стримера или гостей',
    spam: 'Навязчивая реклама, боты или вмешательство в эфир',
    other: 'Другое нарушение правил трансляции',
  }).slice(0, -1),
  {
    reason: 'wrong_category',
    title: REPORT_REASON_TITLE.wrong_category,
    description: 'Эфир стоит не в той категории / с вводящими в заблуждение тегами',
  },
  {
    reason: 'other',
    title: REPORT_REASON_TITLE.other,
    description: 'Другое нарушение правил трансляции',
  },
];

/** Жалоба на сообщение в чате. */
export const MESSAGE_REPORT_CATEGORIES: ReportCategory[] = baseCategories({
  child_safety: 'Сообщение связано с эксплуатацией несовершеннолетних',
  terrorism: 'Пропаганда терроризма или вербовка в сообщении',
  violence: 'Угрозы насилием или описания жестокости в чате',
  sexual: 'Откровенно сексуальный текст или ссылки в сообщении',
  self_harm: 'Призывы к самоповреждению в сообщении',
  harassment: 'Личные нападки, травля, домогательства в чате',
  hate: 'Ненависть или дискриминация в сообщении',
  spam: 'Спам, фишинг, боты, повторяющийся мусор',
  other: 'Другое нарушение правил чата',
});

/** @deprecated use getCategoriesForTarget */
export const REPORT_CATEGORIES = MESSAGE_REPORT_CATEGORIES;

export const getCategoriesForTarget = (targetType: ReportTargetType | string): ReportCategory[] => {
  switch (targetType) {
    case 'stream':
      return STREAM_REPORT_CATEGORIES;
    case 'channel':
    case 'user':
      return PROFILE_REPORT_CATEGORIES;
    case 'message':
    default:
      return MESSAGE_REPORT_CATEGORIES;
  }
};

export const reportReasonLabel = (reason: string) => REPORT_REASON_TITLE[reason as ReportReason] || reason;

export type ReportWizardStep = 'target' | 'category' | 'suboption' | 'details' | 'done';
