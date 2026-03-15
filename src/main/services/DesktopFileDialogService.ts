import { promises as fs } from 'fs';
import path from 'path';
import { BrowserWindow, dialog } from 'electron';

type BrowserWindowProvider = () => BrowserWindow | null;

export class DesktopFileDialogService {
  private readonly getMainWindow: BrowserWindowProvider;

  constructor(getMainWindow: BrowserWindowProvider) {
    this.getMainWindow = getMainWindow;
  }

  async openJsonFileDialog(): Promise<string | null> {
    const window = this.getMainWindow() ?? undefined;
    const result = await dialog.showOpenDialog(window, {
      title: 'JSON-Datei auswählen',
      properties: ['openFile'],
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return fs.readFile(result.filePaths[0], 'utf8');
  }

  async saveJsonFileDialog(input: {
    defaultFileName: string;
    serialized: string;
  }): Promise<string | null> {
    const window = this.getMainWindow() ?? undefined;
    const result = await dialog.showSaveDialog(window, {
      title: 'JSON speichern',
      defaultPath: input.defaultFileName,
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const outputPath = this.ensureFileExtension(result.filePath, '.json');
    await fs.writeFile(outputPath, input.serialized, 'utf8');
    return outputPath;
  }

  async exportWeeklyReportPdf(input: {
    defaultFileName: string;
    html: string;
  }): Promise<string | null> {
    const window = this.getMainWindow() ?? undefined;
    const result = await dialog.showSaveDialog(window, {
      title: 'PDF speichern',
      defaultPath: this.ensurePdfExtension(input.defaultFileName),
      filters: [
        {
          name: 'PDF',
          extensions: ['pdf'],
        },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const outputPath = this.ensureFileExtension(result.filePath, '.pdf');
    const pdfData = await this.renderPdf(input.html);
    await fs.writeFile(outputPath, pdfData);
    return outputPath;
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const previewWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
      },
    });

    try {
      await previewWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      );
      return await previewWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
      });
    } finally {
      if (!previewWindow.isDestroyed()) {
        previewWindow.destroy();
      }
    }
  }

  private ensurePdfExtension(fileName: string): string {
    return this.ensureFileExtension(fileName, '.pdf');
  }

  private ensureFileExtension(fileName: string, extension: string): string {
    if (path.extname(fileName).toLowerCase() === extension) {
      return fileName;
    }

    return `${fileName}${extension}`;
  }
}
