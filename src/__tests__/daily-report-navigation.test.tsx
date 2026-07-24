import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation, type Location } from 'react-router-dom';

import useDailyReportForm from '@/renderer/pages/DailyReportPage/hooks/useDailyReportForm';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/renderer/contexts/ToastControllerContext', () => ({
  useToastController: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock('@/renderer/pages/DailyReportPage/hooks/useDailyReportData', () => ({
  __esModule: true,
  default: () => {
    const location = jest.requireActual('react-router-dom').useLocation();
    const requestedDate = new URLSearchParams(location.search).get('date');

    return {
      uiSettings: {},
      trainingPeriod: { trainingEnd: '2026-12-31' },
      reportStartDate: '2026-01-01',
      absenceSettings: {},
      selectedWeekRange: null,
      requestedDate,
      autoDayType: null,
      autoReasonText: null,
      activitySuggestions: [],
      trainingSuggestions: [],
      lessonTopicSuggestions: [],
      currentWeeklyReport: null,
      currentDailyReport: null,
      currentDailyValues: {},
      isEditing: false,
      isSubmittedDailyReport: false,
      isContentReadOnly: false,
      metaCardTitle: '',
      absenceConflict: null,
      activeStatusBanner: null,
      reportsState: { value: null },
      settingsSnapshot: { value: null },
    };
  },
}));

let currentLocation: Location | null = null;

function LocationObserver() {
  currentLocation = useLocation();
  return null;
}

function Wrapper({ children }: PropsWithChildren) {
  return (
    <MemoryRouter initialEntries={['/daily-report?date=2026-05-08']}>
      <LocationObserver />
      {children}
    </MemoryRouter>
  );
}

describe('daily report navigation', () => {
  it('updates the requested date when navigating from a linked report', () => {
    const { result } = renderHook(() => useDailyReportForm(), {
      wrapper: Wrapper,
    });

    expect(result.current.form.date).toBe('2026-05-08');

    act(() => {
      result.current.selectDate('2026-05-09');
    });

    expect(currentLocation?.search).toBe('?date=2026-05-09');
    expect(result.current.form.date).toBe('2026-05-09');
  });
});
