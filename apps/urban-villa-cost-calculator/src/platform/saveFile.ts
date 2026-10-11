import { claudeUse } from './env';

interface Downloads {
  save(req: { filename: string; data: string | Blob | ArrayBuffer }): Promise<{ status: string }>;
}

export type SaveOutcome = 'saved' | 'declined' | 'failed';

/**
 * Offer a generated file to the user. Inside the claude.ai viewer this goes through the `downloads`
 * capability (the viewer confirms the save); elsewhere it falls back to a normal browser download.
 */
export async function saveFile(filename: string, data: string | Blob, mime = 'application/octet-stream'): Promise<SaveOutcome> {
  const downloads = await claudeUse<Downloads>('downloads');
  if (downloads) {
    try {
      await downloads.save({ filename, data });
      return 'saved';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'declined';
      if (code !== 'unavailable' && code !== 'not_granted' && code !== 'capability_disabled' && code !== 'capability_removed') return 'failed';
      // fall through to a plain download
    }
  }
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'saved';
  } catch {
    return 'failed';
  }
}
