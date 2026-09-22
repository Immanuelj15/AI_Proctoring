export type SupportedLocale = "en" | "hi" | "te" | "ta" | "ml" | "kn";

export interface LocaleMeta {
  code: SupportedLocale;
  name: string;      // In English
  nativeName: string; // In native script
  dir?: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
];

export interface TranslationDictionary {
  brand: {
    title: string;
    tagline: string;
    footer: string;
  };
  nav: {
    overview: string;
    dashboard: string;
    monitoring: string;
    evaluation: string;
    signIn: string;
    signOut: string;
    demoStudent: string;
    demoSurveillance: string;
    demoGrading: string;
    demoAdmin: string;
    demoTitle: string;
  };
  auth: {
    selectPortal: string;
    portalDesc: string;
    candidatePortal: string;
    candidatePortalSub: string;
    examinerHub: string;
    examinerHubSub: string;
    adminConsole: string;
    adminConsoleSub: string;
    portalSignIn: string;
    portalSignInDesc: string;
    roleStudent: string;
    roleExaminer: string;
    roleAdmin: string;
    quickFill: string;
    email: string;
    password: string;
    signInButton: string;
    signingIn: string;
    backToOverview: string;
    dontHaveAccount: string;
    registerLink: string;
    allFieldsRequired: string;
  };
  dashboard: {
    pageTitle: string;
    pageSubtitle: string;
    metricQuestions: string;
    metricExams: string;
    metricCandidates: string;
    metricIntegrity: string;
    tabQuestions: string;
    tabExams: string;
    tabApprovals: string;
    tabReviewQueue: string;
    startExamButton: string;
    durationMinutes: string;
    totalQuestions: string;
    subject: string;
  };
  exam: {
    questionCounter: string;
    timeRemaining: string;
    previousQuestion: string;
    nextQuestion: string;
    reviewAndSubmit: string;
    finalizing: string;
    answerSaved: string;
    unanswered: string;
    confirmSubmitTitle: string;
    confirmSubmitMessage: string;
    confirmSubmitYes: string;
    confirmSubmitCancel: string;
    visionProctor: string;
    streamActive: string;
    connecting: string;
    faceTrack: string;
    tabPolicy: string;
    suspicionIndex: string;
    zeroTrustLockdown: string;
    safe: string;
    enforced: string;
    complianceNotice: string;
    rubricHint: string;
    imageUploadHint: string;
  };
  pwa: {
    installTitle: string;
    installDesc: string;
    installButton: string;
    dismiss: string;
    offlineTitle: string;
    offlineDesc: string;
    recheckConnection: string;
    reminders: string;
    remindersOn: string;
    examRemindersTitle: string;
    examRemindersDesc: string;
    enable: string;
    disable: string;
    test: string;
  };
  common: {
    loading: string;
    save: string;
    cancel: string;
    close: string;
    error: string;
    success: string;
    status: string;
    actions: string;
  };
}
