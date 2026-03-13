export type ConfigSettings = Record<string, unknown>;

export type ConfigRecord = {
  id: string;
  name: string;
  surname: string;
  ihkLink: string | null;
  department: string | null;
  trainerEmail: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  settings: ConfigSettings;
};

