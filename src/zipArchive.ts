import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { publishFile } from './storage';

export async function createChapterZip(folder: string, destination: string, overwrite: boolean): Promise<number> {
  const entries = (await fs.readdir(folder, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /\.(js|png)$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!entries.length) { throw new Error('선택한 장에 JS 또는 PNG 파일이 없습니다.'); }
  const { ZipArchive } = await import('archiver');
  const temp = path.join(path.dirname(destination), `.${randomUUID()}.zip.tmp`);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const output = createWriteStream(temp, { flags: 'wx' });
  try {
    await new Promise<void>((resolve, reject) => {
      const fail = (error: Error) => { archive.abort(); output.destroy(); reject(error); };
      output.on('close', resolve); output.on('error', fail);
      archive.on('error', fail); archive.on('warning', fail);
      archive.pipe(output);
      for (const entry of entries) { archive.file(path.join(folder, entry.name), { name: entry.name }); }
      void archive.finalize().catch(fail);
    });
    await publishFile(temp, destination, overwrite);
    return entries.length;
  } finally {
    archive.abort(); output.destroy();
    // On Windows an errored stream may still be closing its file handle.
    if (!output.closed) { await new Promise<void>(resolve => output.once('close', resolve)); }
    await fs.rm(temp, { force: true });
  }
}
