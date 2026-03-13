import { BrowserWindow } from 'electron';
import fs from 'fs/promises';

export const exportHtmlToPdf = async (html: string, targetPath: string) => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
    },
  });
  try {
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await window.loadURL(url);
    const data = await window.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });
    await fs.writeFile(targetPath, data);
  } finally {
    window.destroy();
  }
};
