export const appRoutes = {
  home: '/',
  dailyReport: '/daily-report',
  weeklyReport: '/weekly-report',
  weeklyReportPdf: '/weekly-report-pdf',
  reportsOverview: '/reports-overview',
  timeTable: '/timetable',
  import: '/import',
  export: '/export',
  settings: '/settings',
  changeAuthMethods: '/change-auth-methods',
  onboarding: '/onboarding',
  login: '/login',
} as const;

export type AppRouteKey = keyof typeof appRoutes;
