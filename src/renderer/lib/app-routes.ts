export const appRoutes = {
  home: '/',
  dailyReport: '/daily-report',
  absences: '/absences',
  weeklyReport: '/weekly-report',
  sendWeeklyReport: '/send-weekly-report',
  weeklyReportPdf: '/weekly-report-pdf',
  reportsOverview: '/reports-overview',
  timeTable: '/timetable',
  import: '/import',
  export: '/export',
  settings: '/settings',
  changeAuthMethods: '/change-auth-methods',
  welcome: '/welcome',
  onboarding: '/onboarding',
  login: '/login',
} as const;

export type AppRouteKey = keyof typeof appRoutes;
