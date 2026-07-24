import { UiSettingsValues } from '@/renderer/lib/app-settings';
import {
  buildDailyReportPayload,
  validateDailyReportPayload,
} from '@/renderer/pages/DailyReportPage/services/daily-report-payload';
import { DailyReportFormState } from '@/renderer/pages/DailyReportPage/utils/form-model';

const uiSettings: UiSettingsValues = {
  defaultDepartment: '',
  supervisorEmailPrimary: '',
  allowEarlyWeeklyReportSubmission: false,
  teachers: ['Teacher A', 'Teacher B'],
  subjects: ['Math', 'English'],
  timetable: {
    monday: [
      { lesson: 1, subject: 'Math', teacher: 'Teacher A' },
      { lesson: 2, subject: 'English', teacher: 'Teacher B' },
    ],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  },
  schoolDays: {
    monday: false,
    tuesday: true,
    wednesday: false,
    thursday: false,
    friday: false,
  },
  textSuggestions: {
    activities: { manual: [], ignored: [] },
    trainings: { manual: [], ignored: [] },
    schoolTopics: { manual: [], ignored: [] },
  },
};

function createSchoolForm(
  values: Partial<DailyReportFormState>,
): DailyReportFormState {
  return {
    date: '2026-05-11',
    dayType: 'school',
    freeReason: '',
    activityDraft: '',
    trainingDraft: '',
    schoolTopicDraft: '',
    activities: [],
    trainings: [],
    schoolTopics: [],
    lessons: [],
    expandedDoubleLessonPairs: [],
    ...values,
  };
}

describe('daily report payload', () => {
  it('does not persist free school lessons from timetable data', () => {
    const payload = buildDailyReportPayload(
      createSchoolForm({
        lessons: [
          {
            lesson: 1,
            subject: 'Math',
            teacher: 'Teacher A',
            topics: ['Algebra'],
          },
        ],
      }),
      {},
      uiSettings,
    );

    expect(payload.lessons).toEqual([
      {
        lesson: 1,
        subject: 'Math',
        teacher: 'Teacher A',
        topics: ['Algebra'],
      },
    ]);
    expect(payload.lessons.some((lesson) => lesson.lesson === 2)).toBe(false);
  });

  it('stores active double lesson topics on the first lesson', () => {
    const payload = buildDailyReportPayload(
      createSchoolForm({
        lessons: [
          {
            lesson: 1,
            subject: 'Math',
            teacher: 'Teacher A',
            topics: ['Algebra'],
          },
          {
            lesson: 2,
            subject: 'Math',
            teacher: 'Teacher A',
            topics: [],
          },
        ],
      }),
      {},
      uiSettings,
    );

    expect(payload.lessons).toEqual([
      {
        lesson: 1,
        subject: 'Math',
        teacher: 'Teacher A',
        topics: ['Algebra'],
      },
      {
        lesson: 2,
        subject: 'Math',
        teacher: 'Teacher A',
        topics: [],
      },
    ]);
  });

  it('requires topics for separated double lesson pairs', () => {
    const form = createSchoolForm({
      expandedDoubleLessonPairs: [1],
      lessons: [
        {
          lesson: 1,
          subject: 'Math',
          teacher: 'Teacher A',
          topics: ['Algebra'],
        },
        {
          lesson: 2,
          subject: 'Math',
          teacher: 'Teacher A',
          topics: [],
        },
      ],
    });
    const payload = buildDailyReportPayload(form, {}, uiSettings);

    expect(
      validateDailyReportPayload(payload, {
        expandedDoubleLessonPairs: form.expandedDoubleLessonPairs,
      }),
    ).toBe('dailyReport.feedback.missingSchoolLessonTopics');
  });

  it('allows school days without lessons when school topics exist', () => {
    const payload = buildDailyReportPayload(
      createSchoolForm({
        date: '2026-05-12',
        schoolTopics: ['Projektplanung im Unterricht'],
        lessons: [],
      }),
      {},
      uiSettings,
    );

    expect(payload.lessons).toEqual([]);
    expect(payload.schoolTopics).toEqual(['Projektplanung im Unterricht']);
    expect(validateDailyReportPayload(payload)).toBeNull();
  });

  it('requires school topics for school days without lessons', () => {
    const payload = buildDailyReportPayload(
      createSchoolForm({
        date: '2026-05-12',
        lessons: [],
      }),
      {},
      uiSettings,
    );

    expect(validateDailyReportPayload(payload)).toBe(
      'dailyReport.feedback.missingSchoolTopics',
    );
  });
});
