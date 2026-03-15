export async function readTextFile(file: File): Promise<string> {
  return file.text();
}

export function downloadTextFile(input: {
  fileName: string;
  content: string;
  contentType?: string;
}): void {
  const blob = new Blob([input.content], {
    type: input.contentType ?? 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = input.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
