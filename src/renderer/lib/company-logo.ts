import { companyLogoDataUrlMaxLength } from '@/shared/onboarding/company-logo';

export type CompanyLogoFileError =
  | 'invalidType'
  | 'tooLarge'
  | 'notTransparent'
  | 'unreadable';

export type CompanyLogoFileResult =
  | {
      ok: true;
      dataUrl: string;
    }
  | {
      ok: false;
      error: CompanyLogoFileError;
    };

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const maxLogoFileSize = Math.floor((companyLogoDataUrlMaxLength * 3) / 4);

async function fileHasPngSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  return pngSignature.every((byte, index) => header[index] === byte);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('invalid-result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = dataUrl;
  });
}

async function pngHasTransparency(dataUrl: string): Promise<boolean> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    return false;
  }

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return false;
  }

  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);

  for (let index = 3; index < data.length; index += 4) {
    const alpha = data.at(index) ?? 255;

    if (alpha < 255) {
      return true;
    }
  }

  return false;
}

export async function readTransparentPngLogoFile(
  file: File,
): Promise<CompanyLogoFileResult> {
  try {
    if (file.size > maxLogoFileSize) {
      return { ok: false, error: 'tooLarge' };
    }

    if (!(await fileHasPngSignature(file))) {
      return { ok: false, error: 'invalidType' };
    }

    const dataUrl = await readFileAsDataUrl(file);

    if (dataUrl.length > companyLogoDataUrlMaxLength) {
      return { ok: false, error: 'tooLarge' };
    }

    if (!(await pngHasTransparency(dataUrl))) {
      return { ok: false, error: 'notTransparent' };
    }

    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: 'unreadable' };
  }
}
