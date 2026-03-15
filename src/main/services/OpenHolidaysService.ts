import { z } from 'zod';

const localizedTextSchema = z.object({
  language: z.string().trim().min(2).max(16),
  text: z.string().trim().min(1).max(240),
});

const subdivisionRefSchema = z.object({
  code: z.string().trim().min(1),
  shortName: z.string().trim().max(40).optional().default(''),
});

const holidayResponseSchema = z.object({
  id: z.string().trim().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  name: z.array(localizedTextSchema).default([]),
  nationwide: z.boolean().default(false),
  subdivisions: z.array(subdivisionRefSchema).optional().default([]),
});

const holidaysResponseSchema = z.array(holidayResponseSchema);

type HolidayResponse = z.infer<typeof holidayResponseSchema>;

export type OpenHolidayEntry = {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  names: Array<{ language: string; text: string }>;
  nationwide: boolean;
  subdivisionCodes: string[];
};

export type OpenHolidaysYearCatalog = {
  publicHolidays: OpenHolidayEntry[];
  schoolHolidays: OpenHolidayEntry[];
};

type FetchHolidayInput = {
  subdivisionCode: string;
  year: number;
};

function readHolidayName(holiday: HolidayResponse): string {
  const germanName = holiday.name.find((entry) => entry.language === 'DE');

  if (germanName) {
    return germanName.text;
  }

  return holiday.name[0]?.text ?? 'Unbenannt';
}

function normalizeHolidayEntry(holiday: HolidayResponse): OpenHolidayEntry {
  return {
    id: holiday.id,
    startDate: holiday.startDate,
    endDate: holiday.endDate,
    name: readHolidayName(holiday),
    names: holiday.name.map((entry) => ({
      language: entry.language,
      text: entry.text,
    })),
    nationwide: holiday.nationwide,
    subdivisionCodes: holiday.subdivisions.map((entry) => entry.code),
  };
}

export default class OpenHolidaysService {
  private readonly baseUrl: string;

  private readonly timeoutMs: number;

  constructor(input?: { baseUrl?: string; timeoutMs?: number }) {
    this.baseUrl = input?.baseUrl?.trim() || 'https://openholidaysapi.org';
    this.timeoutMs = input?.timeoutMs ?? 15000;
  }

  async fetchYearCatalog(
    input: FetchHolidayInput,
  ): Promise<OpenHolidaysYearCatalog> {
    const [publicHolidays, schoolHolidays] = await Promise.all([
      this.fetchPublicHolidays(input),
      this.fetchSchoolHolidays(input),
    ]);

    return {
      publicHolidays,
      schoolHolidays,
    };
  }

  private async fetchPublicHolidays(
    input: FetchHolidayInput,
  ): Promise<OpenHolidayEntry[]> {
    return this.fetchHolidays('/PublicHolidays', input);
  }

  private async fetchSchoolHolidays(
    input: FetchHolidayInput,
  ): Promise<OpenHolidayEntry[]> {
    return this.fetchHolidays('/SchoolHolidays', input);
  }

  private async fetchHolidays(
    endpoint: '/PublicHolidays' | '/SchoolHolidays',
    input: FetchHolidayInput,
  ): Promise<OpenHolidayEntry[]> {
    const validFrom = `${input.year}-01-01`;
    const validTo = `${input.year}-12-31`;
    const searchParams = new URLSearchParams({
      countryIsoCode: 'DE',
      languageIsoCode: 'DE',
      subdivisionCode: input.subdivisionCode,
      validFrom,
      validTo,
    });
    const response = await this.fetchJson(
      `${this.baseUrl}${endpoint}?${searchParams.toString()}`,
    );
    const parsed = holidaysResponseSchema.parse(response);

    return parsed.map((entry) => normalizeHolidayEntry(entry));
  }

  private async fetchJson(url: string): Promise<unknown> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(
          `OpenHolidays request failed (${response.status} ${response.statusText}).`,
        );
      }

      return response.json();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('aborted'))
      ) {
        throw new Error('OpenHolidays request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
