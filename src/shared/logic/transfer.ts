export type ExportFormat = 'json' | 'pdf';

export type ExportResult = {
  format: ExportFormat;
  targetPath: string | null;
  itemCount: number;
};

export type ImportPreview = {
  sourcePath: string;
  canImport: boolean;
  warnings: string[];
};

export type ImportResult = {
  importedItems: number;
  warnings: string[];
};

