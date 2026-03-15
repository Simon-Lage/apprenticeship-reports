export type GermanSubdivision = {
  code: string;
  name: string;
};

export const germanSubdivisions: GermanSubdivision[] = [
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BW', name: 'Baden-Wuerttemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-TH', name: 'Thueringen' },
];

const germanSubdivisionCodeSet = new Set(
  germanSubdivisions.map((entry) => entry.code),
);

export function isGermanSubdivisionCode(value: string): boolean {
  return germanSubdivisionCodeSet.has(value);
}
