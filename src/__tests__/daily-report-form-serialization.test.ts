import serializeDailyFormState from '@/renderer/pages/DailyReportPage/utils/form-serialization';
import { DailyReportFormState } from '@/renderer/pages/DailyReportPage/utils/form-model';

function createForm(
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

describe('daily report form serialization', () => {
  it('keeps empty editable lesson topic rows out of strict lesson normalization', () => {
    expect(() =>
      serializeDailyFormState(
        createForm({
          lessons: [
            {
              lesson: 1,
              subject: 'Math',
              teacher: 'Teacher A',
              topics: ['Algebra', ''],
            },
          ],
        }),
      ),
    ).not.toThrow();

    expect(
      JSON.parse(
        serializeDailyFormState(
          createForm({
            lessons: [
              {
                lesson: 1,
                subject: 'Math',
                teacher: 'Teacher A',
                topics: ['Algebra', ''],
              },
            ],
          }),
        ),
      ).lessons,
    ).toEqual([
      {
        lesson: 1,
        subject: 'Math',
        teacher: 'Teacher A',
        topics: ['Algebra'],
      },
    ]);
  });
});
